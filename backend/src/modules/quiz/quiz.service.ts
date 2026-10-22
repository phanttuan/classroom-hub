import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ActivityStatus,
  AttemptGradingMethod,
  AttemptStatus,
  GradeCategory,
  UserRole,
} from '../../generated/prisma/enums.js';
import { QuizGradeSyncService } from '../quiz-attempt/quiz-grade-sync.service.js';
import { QuizAttemptService } from '../quiz-attempt/quiz-attempt.service.js';
import { aggregateAttemptScores } from '../quiz-attempt/quiz-grading.js';
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
  constructor(
    private readonly prisma: PrismaService,
    // Tùy chọn để unit test cũ (new QuizService(prisma)) không phải truyền thêm
    @Optional() private readonly gradeSync?: QuizGradeSyncService,
    @Optional() private readonly attempts?: QuizAttemptService,
  ) {}

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
          attemptGrading: (dto.attemptGrading as AttemptGradingMethod | undefined) ?? AttemptGradingMethod.HIGHEST,
          shuffleQuestions: dto.shuffleQuestions ?? false,
          shuffleChoices: dto.shuffleChoices ?? false,
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
          // Lượt làm của chính sinh viên → badge trạng thái trên trang khóa học
          attempts: {
            where: { studentId: viewer.id },
            select: { id: true, status: true, totalScore: true, attemptNumber: true },
          },
        },
      });

      return quizzes.map(({ attempts, ...quiz }) =>
        this.formatQuiz(quiz, {
          quizQuestions: quiz.quizQuestions,
          gradeItem: quiz.gradeItem,
          myAttempts: this.summarizeMyAttempts(attempts ?? [], quiz.attemptGrading),
        }),
      );
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

    // Đề đã đóng: khóa hoàn toàn. Đề đã xuất bản: sửa được cấu hình (gia hạn, số lượt, cách tính điểm,
    // trộn đề, hiện đáp án, topic...) nhưng KHÔNG đổi chấm điểm vào sổ — GradeItem.maxScore đã chốt khi publish.
    if (existing.status === ActivityStatus.CLOSED) {
      throw new ConflictException('Đề kiểm tra đã đóng, không thể chỉnh sửa');
    }
    if (
      existing.status === ActivityStatus.PUBLISHED &&
      dto.scoringEnabled !== undefined &&
      dto.scoringEnabled !== existing.scoringEnabled
    ) {
      throw new ConflictException(
        'Không thể bật / tắt chấm điểm vào sổ sau khi đề đã xuất bản (tổng điểm đã được chốt)',
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
    if (dto.attemptGrading !== undefined) {
      data.attemptGrading = dto.attemptGrading as AttemptGradingMethod;
    }
    if (dto.shuffleQuestions !== undefined) data.shuffleQuestions = dto.shuffleQuestions;
    if (dto.shuffleChoices !== undefined) data.shuffleChoices = dto.shuffleChoices;

    const scoringChanged =
      dto.scoringEnabled !== undefined &&
      dto.scoringEnabled !== existing.scoringEnabled;
    const gradingChanged =
      dto.attemptGrading !== undefined &&
      dto.attemptGrading !== existing.attemptGrading;

    const result = await this.prisma.$transaction(async (tx) => {
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

    // Đổi cách tính điểm nhiều lượt khi đã có lượt làm → tính lại điểm sổ của mọi sinh viên
    if (gradingChanged && existing.status !== ActivityStatus.DRAFT) {
      await this.gradeSync?.resyncQuizGrades(quizId);
    }
    return result;
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

    // Đóng đề → chốt ngay mọi lượt đang làm dở (chấm với đáp án đã lưu), sinh viên không tiếp tục được nữa
    await this.attempts?.finalizeOpenAttempts(quizId);

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
      attemptGrading?: AttemptGradingMethod;
      shuffleQuestions?: boolean;
      shuffleChoices?: boolean;
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
      myAttempts?: MyAttemptsSummary | null;
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
      attemptGrading: quiz.attemptGrading ?? AttemptGradingMethod.HIGHEST,
      shuffleQuestions: quiz.shuffleQuestions ?? false,
      shuffleChoices: quiz.shuffleChoices ?? false,
      status: quiz.status,
      publishedAt: quiz.publishedAt,
      gradeItemId: extra?.gradeItem?.id.toString() ?? null,
      totalMaxScore: totalMaxScore.toFixed(2),
      questionCount: questions.length,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      ...(extra?.attemptStats ? { attemptStats: extra.attemptStats } : {}),
      ...(extra && 'myAttempts' in extra ? { myAttempts: extra.myAttempts } : {}),
      ...(extra?.questions ? { questions: extra.questions } : {}),
    };
  }

  /** Tóm tắt lượt làm của sinh viên gắn kèm đề (chi tiết lấy ở QuizAttemptService) */
  private summarizeMyAttempts(
    attempts: Array<{ id: bigint; status: AttemptStatus; totalScore: ScoreValue; attemptNumber: number }>,
    attemptGrading: AttemptGradingMethod,
  ): MyAttemptsSummary | null {
    if (!attempts.length) return null;
    const sorted = [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber);
    const inProgress = sorted.find((a) => a.status === AttemptStatus.IN_PROGRESS);
    const graded = sorted
      .filter((a) => a.status === AttemptStatus.GRADED)
      .map((a) => ({ attemptNumber: a.attemptNumber, totalScore: new Prisma.Decimal(a.totalScore ?? 0) }));
    return {
      count: sorted.length,
      inProgressAttemptId: inProgress ? inProgress.id.toString() : null,
      latestScore: graded.length ? graded[graded.length - 1].totalScore.toFixed(2) : null,
      bestScore: aggregateAttemptScores(AttemptGradingMethod.HIGHEST, graded)?.toFixed(2) ?? null,
      // Điểm theo đúng cách tính của đề → khớp với điểm ghi sổ
      gradeScore: aggregateAttemptScores(attemptGrading, graded)?.toFixed(2) ?? null,
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

export interface MyAttemptsSummary {
  count: number;
  inProgressAttemptId: string | null;
  latestScore: string | null;
  bestScore: string | null;
  gradeScore: string | null;
}
