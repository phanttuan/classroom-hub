import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ActivityStatus,
  AttemptStatus,
  GradeCategory,
  UserRole,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { AddQuizQuestionDto } from './dto/add-quiz-question.dto.js';
import { UpdateQuizQuestionDto } from './dto/update-quiz-question.dto.js';

export interface QuizViewer {
  id: bigint;
  role: UserRole;
}

type ScoreValue = Prisma.Decimal | number | string | null | undefined;

function formatScore(val: ScoreValue): string {
  if (val === null || val === undefined) return '0.00';
  if (
    typeof val === 'object' &&
    'toFixed' in val &&
    typeof val.toFixed === 'function'
  ) {
    return val.toFixed(2);
  }
  const num = Number(val);
  return Number.isNaN(num) ? '0.00' : num.toFixed(2);
}

function sumScores(items: Array<{ maxScore: ScoreValue }>): Prisma.Decimal {
  return items.reduce(
    (total, item) => total.plus(new Prisma.Decimal(item.maxScore ?? 0)),
    new Prisma.Decimal(0),
  );
}

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // QUIZ CRUD
  // =========================================================================

  /** Tạo đề kiểm tra DRAFT; chỉ tạo GradeItem khi bật chấm điểm. */
  async create(teacherId: bigint, courseId: bigint, dto: CreateQuizDto) {
    const openAt = new Date(dto.openAt);
    const dueAt = new Date(dto.dueAt);
    this.assertValidDateRange(openAt, dueAt);

    const moduleId = BigInt(dto.moduleId);
    await this.assertModuleInCourse(moduleId, courseId);

    const scoringEnabled = dto.scoringEnabled ?? true;

    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          courseId,
          moduleId,
          createdBy: teacherId,
          title: dto.title.trim(),
          instructions: dto.instructions ?? null,
          openAt,
          dueAt,
          durationMinutes: dto.durationMinutes ?? null,
          maxAttempts: dto.maxAttempts ?? 1,
          scoringEnabled,
          showAnswersAfterSubmit: dto.showAnswersAfterSubmit ?? false,
          status: ActivityStatus.DRAFT,
        },
      });

      let gradeItemId: bigint | undefined;
      if (scoringEnabled) {
        const gradeItem = await tx.gradeItem.create({
          data: {
            courseId,
            category: GradeCategory.QUIZ,
            quizId: quiz.id,
            maxScore: new Prisma.Decimal(0),
          },
        });
        gradeItemId = gradeItem.id;
      }

      return this.formatQuiz(quiz, {
        quizQuestions: [],
        gradeItem: gradeItemId !== undefined ? { id: gradeItemId } : null,
      });
    });
  }

  /**
   * Danh sách đề kiểm tra theo khóa học.
   * - Giáo viên/Admin: thấy cả DRAFT + thống kê lượt làm bài.
   * - Học sinh: chỉ thấy PUBLISHED/CLOSED và không có danh sách câu hỏi/đáp án.
   */
  async findAll(
    courseId: bigint,
    viewer: QuizViewer,
    statusFilter?: string,
    moduleIdFilter?: string,
  ) {
    const parsedModuleId = this.parseOptionalId(
      moduleIdFilter,
      'Mã chủ đề (moduleId) không hợp lệ',
    );

    if (viewer.role === UserRole.STUDENT) {
      const where: Prisma.QuizWhereInput = {
        courseId,
        status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.CLOSED] },
      };
      if (parsedModuleId !== undefined) where.moduleId = parsedModuleId;

      const quizzes = await this.prisma.quiz.findMany({
        where,
        // Quiz không có orderIndex: giữ thứ tự tạo (cũ → mới) theo trình tự nội dung.
        orderBy: { createdAt: 'asc' },
        include: {
          gradeItem: { select: { id: true } },
          quizQuestions: { select: { maxScore: true } },
        },
      });

      return quizzes.map((quiz) => this.formatQuiz(quiz, quiz));
    }

    const where: Prisma.QuizWhereInput = { courseId };
    if (parsedModuleId !== undefined) where.moduleId = parsedModuleId;

    if (statusFilter) {
      const upper = statusFilter.trim().toUpperCase();
      if (!Object.values(ActivityStatus).includes(upper as ActivityStatus)) {
        throw new BadRequestException('Trạng thái đề kiểm tra không hợp lệ');
      }
      where.status = upper as ActivityStatus;
    }

    const quizzes = await this.prisma.quiz.findMany({
      where,
      // Quiz không có orderIndex: giữ thứ tự tạo (cũ → mới) theo trình tự nội dung.
      orderBy: { createdAt: 'asc' },
      include: {
        gradeItem: { select: { id: true } },
        quizQuestions: { select: { maxScore: true } },
        attempts: { select: { status: true } },
      },
    });

    return quizzes.map(({ attempts, ...quiz }) => {
      const submitted = attempts.filter(
        (attempt) => attempt.status !== AttemptStatus.IN_PROGRESS,
      ).length;
      return this.formatQuiz(quiz, {
        ...quiz,
        attemptStats: { submitted, total: attempts.length },
      });
    });
  }

  /**
   * Chi tiết đề kiểm tra.
   * Bảo mật: học sinh không bao giờ nhận mảng `questions` (chứa đáp án đúng).
   */
  async findOne(courseId: bigint, quizId: bigint, viewer: QuizViewer) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, courseId },
      include: {
        gradeItem: { select: { id: true } },
        quizQuestions: { select: { maxScore: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Đề kiểm tra không tồn tại trong khóa học này');
    }

    if (viewer.role === UserRole.STUDENT) {
      if (quiz.status === ActivityStatus.DRAFT) {
        throw new ForbiddenException(
          'Sinh viên không có quyền xem đề kiểm tra đang ở trạng thái nháp',
        );
      }
      return this.formatQuiz(quiz, quiz);
    }

    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { orderIndex: 'asc' },
    });

    return this.formatQuiz(quiz, {
      quizQuestions: quiz.quizQuestions,
      gradeItem: quiz.gradeItem,
      questions: questions.map((question) => this.formatQuizQuestion(question)),
    });
  }

  /** Cập nhật cấu hình đề kiểm tra — chỉ khi DRAFT. */
  async update(
    _teacherId: bigint,
    courseId: bigint,
    quizId: bigint,
    dto: UpdateQuizDto,
  ) {
    const existing = await this.prisma.quiz.findFirst({
      where: { id: quizId, courseId },
      include: { gradeItem: { select: { id: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Đề kiểm tra không tồn tại trong khóa học này');
    }

    if (existing.status !== ActivityStatus.DRAFT) {
      throw new ConflictException(
        'Chỉ có thể chỉnh sửa đề kiểm tra khi ở trạng thái nháp (DRAFT)',
      );
    }

    if (dto.openAt !== undefined || dto.dueAt !== undefined) {
      this.assertValidDateRange(
        dto.openAt !== undefined ? new Date(dto.openAt) : existing.openAt,
        dto.dueAt !== undefined ? new Date(dto.dueAt) : existing.dueAt,
      );
    }

    const data: Prisma.QuizUpdateInput = {};
    if (dto.moduleId !== undefined) {
      const newModuleId = BigInt(dto.moduleId);
      await this.assertModuleInCourse(newModuleId, courseId);
      data.module = { connect: { id: newModuleId } };
    }
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.openAt !== undefined) data.openAt = new Date(dto.openAt);
    if (dto.dueAt !== undefined) data.dueAt = new Date(dto.dueAt);
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes;
    }
    if (dto.maxAttempts !== undefined) data.maxAttempts = dto.maxAttempts;
    if (dto.scoringEnabled !== undefined) {
      data.scoringEnabled = dto.scoringEnabled;
    }
    if (dto.showAnswersAfterSubmit !== undefined) {
      data.showAnswersAfterSubmit = dto.showAnswersAfterSubmit;
    }

    const scoringChanged =
      dto.scoringEnabled !== undefined &&
      dto.scoringEnabled !== existing.scoringEnabled;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.quiz.update({
        where: { id: quizId },
        data,
        include: {
          gradeItem: { select: { id: true } },
          quizQuestions: { select: { maxScore: true } },
        },
      });

      if (scoringChanged) {
        if (dto.scoringEnabled === false) {
          await tx.gradeItem.deleteMany({ where: { quizId } });
          updated.gradeItem = null;
        } else {
          const aggregate = await tx.quizQuestion.aggregate({
            where: { quizId },
            _sum: { maxScore: true },
          });
          const gradeItem = await tx.gradeItem.upsert({
            where: { quizId },
            create: {
              courseId,
              category: GradeCategory.QUIZ,
              quizId,
              maxScore: aggregate._sum.maxScore ?? new Prisma.Decimal(0),
            },
            update: {
              maxScore: aggregate._sum.maxScore ?? new Prisma.Decimal(0),
            },
          });
          updated.gradeItem = { id: gradeItem.id };
        }
      }

      return this.formatQuiz(updated);
    });
  }

  /** Xuất bản DRAFT → PUBLISHED, chốt tổng điểm vào GradeItem. */
  async publish(courseId: bigint, quizId: bigint) {
    const existing = await this.prisma.quiz.findFirst({
      where: { id: quizId, courseId },
      include: { gradeItem: { select: { id: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Đề kiểm tra không tồn tại trong khóa học này');
    }
    if (existing.status !== ActivityStatus.DRAFT) {
      throw new ConflictException(
        'Chỉ có thể xuất bản đề kiểm tra đang ở trạng thái nháp (DRAFT)',
      );
    }

    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      select: { maxScore: true },
    });
    if (questions.length === 0) {
      throw new BadRequestException(
        'Đề kiểm tra phải có ít nhất một câu hỏi trước khi xuất bản',
      );
    }

    this.assertValidDateRange(existing.openAt, existing.dueAt);
    const totalMaxScore = sumScores(questions);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.quiz.update({
        where: { id: quizId },
        data: {
          status: ActivityStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        include: { gradeItem: { select: { id: true } } },
      });

      let gradeItemId = updated.gradeItem?.id;
      if (existing.scoringEnabled) {
        const gradeItem = await tx.gradeItem.upsert({
          where: { quizId },
          create: {
            courseId,
            category: GradeCategory.QUIZ,
            quizId,
            maxScore: totalMaxScore,
          },
          update: { maxScore: totalMaxScore },
        });
        gradeItemId = gradeItem.id;
      }

      return this.formatQuiz(updated, {
        quizQuestions: questions,
        gradeItem: gradeItemId !== undefined ? { id: gradeItemId } : null,
      });
    });
  }

  /** Đóng đề PUBLISHED → CLOSED. */
  async close(courseId: bigint, quizId: bigint) {
    const existing = await this.prisma.quiz.findFirst({
      where: { id: quizId, courseId },
      include: {
        gradeItem: { select: { id: true } },
        quizQuestions: { select: { maxScore: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Đề kiểm tra không tồn tại trong khóa học này');
    }
    if (existing.status !== ActivityStatus.PUBLISHED) {
      throw new ConflictException(
        'Chỉ có thể đóng đề kiểm tra đang ở trạng thái đã xuất bản (PUBLISHED)',
      );
    }

    const updated = await this.prisma.quiz.update({
      where: { id: quizId },
      data: { status: ActivityStatus.CLOSED },
      include: { gradeItem: { select: { id: true } } },
    });

    return this.formatQuiz(updated, {
      quizQuestions: existing.quizQuestions,
      gradeItem: updated.gradeItem,
    });
  }

  /** Xóa đề kiểm tra — chỉ khi DRAFT. */
  async remove(courseId: bigint, quizId: bigint) {
    const existing = await this.prisma.quiz.findFirst({
      where: { id: quizId, courseId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException('Đề kiểm tra không tồn tại trong khóa học này');
    }
    if (existing.status !== ActivityStatus.DRAFT) {
      throw new ConflictException(
        'Chỉ có thể xóa đề kiểm tra khi ở trạng thái nháp (DRAFT)',
      );
    }

    await this.prisma.quiz.delete({ where: { id: quizId } });
    return { id: quizId.toString() };
  }

  // =========================================================================
  // QUIZ QUESTIONS (chỉ khi DRAFT)
  // =========================================================================

  /** Thêm câu hỏi từ ngân hàng của chính giáo viên (chống IDOR). */
  async addQuestion(
    teacherId: bigint,
    courseId: bigint,
    quizId: bigint,
    dto: AddQuizQuestionDto,
  ) {
    await this.assertQuizDraft(courseId, quizId);

    const question = await this.prisma.questionBank.findUnique({
      where: { id: BigInt(dto.questionId) },
      include: { choices: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!question) {
      throw new NotFoundException(
        'Câu hỏi không tồn tại trong ngân hàng câu hỏi',
      );
    }

    // Chống IDOR: giáo viên chỉ được dùng câu hỏi thuộc ngân hàng của mình.
    if (BigInt(question.ownerId) !== BigInt(teacherId)) {
      throw new ForbiddenException(
        'Bạn không có quyền sử dụng câu hỏi từ ngân hàng của giáo viên khác',
      );
    }

    const duplicated = await this.prisma.quizQuestion.findUnique({
      where: {
        uk_quiz_questions_quiz_question: {
          quizId,
          questionId: question.id,
        },
      },
    });
    if (duplicated) {
      throw new ConflictException('Câu hỏi này đã có trong đề kiểm tra');
    }

    const maxScore =
      dto.maxScore !== undefined
        ? new Prisma.Decimal(dto.maxScore)
        : question.defaultScore;

    const aggregate = await this.prisma.quizQuestion.aggregate({
      where: { quizId },
      _max: { orderIndex: true },
    });
    const orderIndex = (aggregate._max.orderIndex ?? 0) + 1;

    const snapshot: Prisma.InputJsonValue = {
      questionId: question.id.toString(),
      questionKey: question.questionKey,
      version: question.version,
      content: question.content,
      questionType: question.questionType,
      defaultScore: formatScore(question.defaultScore),
      choices: question.choices.map((choice) => ({
        id: choice.id.toString(),
        content: choice.content,
        isCorrect: choice.isCorrect,
        orderIndex: choice.orderIndex,
      })),
    };

    try {
      const created = await this.prisma.quizQuestion.create({
        data: {
          quizId,
          questionId: question.id,
          orderIndex,
          maxScore,
          questionSnapshot: snapshot,
        },
      });
      return this.formatQuizQuestion(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Câu hỏi này đã có trong đề kiểm tra');
      }
      throw error;
    }
  }

  /** Sửa điểm của một câu hỏi trong đề — chỉ khi DRAFT. */
  async updateQuestion(
    courseId: bigint,
    quizId: bigint,
    quizQuestionId: bigint,
    dto: UpdateQuizQuestionDto,
  ) {
    await this.assertQuizDraft(courseId, quizId);
    const question = await this.findQuizQuestion(quizId, quizQuestionId);

    const updated = await this.prisma.quizQuestion.update({
      where: { id: question.id },
      data: { maxScore: new Prisma.Decimal(dto.maxScore) },
    });
    return this.formatQuizQuestion(updated);
  }

  /** Xóa câu hỏi khỏi đề — chỉ khi DRAFT. */
  async removeQuestion(
    courseId: bigint,
    quizId: bigint,
    quizQuestionId: bigint,
  ) {
    await this.assertQuizDraft(courseId, quizId);
    const question = await this.findQuizQuestion(quizId, quizQuestionId);
    await this.prisma.quizQuestion.delete({ where: { id: question.id } });
    return { id: question.id.toString() };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private assertValidDateRange(openAt: Date, dueAt: Date) {
    if (
      Number.isNaN(openAt.getTime()) ||
      Number.isNaN(dueAt.getTime()) ||
      dueAt <= openAt
    ) {
      throw new BadRequestException(
        'Hạn đóng (dueAt) phải lớn hơn thời gian mở đề kiểm tra (openAt)',
      );
    }
  }

  private async assertModuleInCourse(moduleId: bigint, courseId: bigint) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!module || module.courseId !== courseId) {
      throw new BadRequestException(
        'Topic (moduleId) không tồn tại hoặc không thuộc khóa học này',
      );
    }
  }

  private async assertQuizDraft(courseId: bigint, quizId: bigint) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, courseId },
      select: { id: true, status: true },
    });
    if (!quiz) {
      throw new NotFoundException('Đề kiểm tra không tồn tại trong khóa học này');
    }
    if (quiz.status !== ActivityStatus.DRAFT) {
      throw new ConflictException(
        'Chỉ có thể thay đổi câu hỏi khi đề kiểm tra ở trạng thái nháp (DRAFT)',
      );
    }
    return quiz;
  }

  private async findQuizQuestion(quizId: bigint, quizQuestionId: bigint) {
    const question = await this.prisma.quizQuestion.findFirst({
      where: { id: quizQuestionId, quizId },
    });
    if (!question) {
      throw new NotFoundException(
        'Câu hỏi không tồn tại trong đề kiểm tra này',
      );
    }
    return question;
  }

  private parseOptionalId(value: string | undefined, message: string) {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      throw new BadRequestException(message);
    }
    return BigInt(trimmed);
  }

  private formatQuiz(
    quiz: {
      id: bigint;
      courseId: bigint;
      moduleId: bigint;
      createdBy: bigint;
      title: string;
      instructions: string | null;
      openAt: Date;
      dueAt: Date;
      durationMinutes: number | null;
      maxAttempts: number;
      scoringEnabled: boolean;
      showAnswersAfterSubmit: boolean;
      status: ActivityStatus;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    extra?: {
      quizQuestions?: Array<{ maxScore: ScoreValue }>;
      gradeItem?: { id: bigint } | null;
      questions?: ReturnType<QuizService['formatQuizQuestion']>[];
      attemptStats?: { submitted: number; total: number };
    },
  ) {
    const questions = extra?.quizQuestions ?? [];
    const totalMaxScore = sumScores(questions);

    return {
      id: quiz.id.toString(),
      courseId: quiz.courseId.toString(),
      moduleId: quiz.moduleId.toString(),
      createdBy: quiz.createdBy.toString(),
      title: quiz.title,
      instructions: quiz.instructions,
      openAt: quiz.openAt,
      dueAt: quiz.dueAt,
      durationMinutes: quiz.durationMinutes,
      maxAttempts: quiz.maxAttempts,
      scoringEnabled: quiz.scoringEnabled,
      showAnswersAfterSubmit: quiz.showAnswersAfterSubmit,
      status: quiz.status,
      publishedAt: quiz.publishedAt,
      gradeItemId: extra?.gradeItem?.id.toString() ?? null,
      totalMaxScore: totalMaxScore.toFixed(2),
      questionCount: questions.length,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      ...(extra?.attemptStats ? { attemptStats: extra.attemptStats } : {}),
      ...(extra?.questions ? { questions: extra.questions } : {}),
    };
  }

  private formatQuizQuestion(question: {
    id: bigint;
    quizId: bigint;
    questionId: bigint;
    orderIndex: number;
    maxScore: ScoreValue;
    questionSnapshot: unknown;
    createdAt: Date;
  }) {
    return {
      id: question.id.toString(),
      quizId: question.quizId.toString(),
      questionId: question.questionId.toString(),
      orderIndex: question.orderIndex,
      maxScore: formatScore(question.maxScore),
      questionSnapshot: question.questionSnapshot,
      createdAt: question.createdAt,
    };
  }
}
