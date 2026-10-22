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
  CourseStatus,
  EnrollmentStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { QuizGradeSyncService } from './quiz-grade-sync.service.js';
import {
  aggregateAttemptScores,
  gradeQuestion,
  parseSnapshot,
  shuffle,
  toStudentSnapshot,
} from './quiz-grading.js';
import type { AttemptAnswerInputDto, SubmitAttemptDto } from './dto/save-answers.dto.js';

/** Thời gian nới sau hạn để bù độ trễ mạng khi nộp bài */
export const SUBMIT_GRACE_MS = 30_000;

export type AttemptBlockReason =
  | 'DRAFT'
  | 'CLOSED'
  | 'NOT_OPEN'
  | 'PAST_DUE'
  | 'COURSE_ARCHIVED'
  | 'NO_QUESTIONS'
  | 'NO_ATTEMPTS_LEFT';

export interface AttemptWindow {
  canStart: boolean;
  reason: AttemptBlockReason | null;
  isPastDue: boolean;
  attemptsUsed: number;
  attemptsLeft: number;
  inProgressAttemptId: string | null;
}

const BLOCK_MESSAGES: Record<AttemptBlockReason, string> = {
  DRAFT: 'Đề kiểm tra chưa được xuất bản',
  CLOSED: 'Giáo viên đã đóng đề kiểm tra',
  NOT_OPEN: 'Đề kiểm tra chưa đến thời gian mở',
  PAST_DUE: 'Đã quá hạn làm bài',
  COURSE_ARCHIVED: 'Khóa học đã lưu trữ (chỉ đọc)',
  NO_QUESTIONS: 'Đề kiểm tra chưa có câu hỏi',
  NO_ATTEMPTS_LEFT: 'Bạn đã dùng hết số lượt làm bài',
};

export interface Viewer {
  id: bigint;
  role: UserRole;
}

const quizInclude = {
  course: { select: { status: true } },
  gradeItem: { select: { id: true, maxScore: true } },
  _count: { select: { quizQuestions: true } },
} satisfies Prisma.QuizInclude;
type QuizRow = Prisma.QuizGetPayload<{ include: typeof quizInclude }>;

const attemptInclude = {
  attemptQuestions: {
    orderBy: { orderIndex: 'asc' as const },
    include: { attemptAnswer: { include: { selectedChoices: { select: { choiceId: true } } } } },
  },
} satisfies Prisma.QuizAttemptInclude;
type AttemptRow = Prisma.QuizAttemptGetPayload<{ include: typeof attemptInclude }>;

const studentSelect = { id: true, fullName: true, email: true, avatarUrl: true } as const;

const fmt = (d: Prisma.Decimal | null | undefined) => (d === null || d === undefined ? null : d.toFixed(2));

/**
 * Lượt làm bài trắc nghiệm của sinh viên: bắt đầu (snapshot đề), lưu nháp từng câu, nộp + chấm tự động,
 * xem kết quả; giáo viên xem bảng lượt làm bài. Mọi kiểm tra thời hạn và đáp án đúng đều ở máy chủ.
 */
@Injectable()
export class QuizAttemptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gradeSync: QuizGradeSyncService,
  ) {}

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async loadQuiz(courseId: bigint, quizId: bigint): Promise<QuizRow> {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, courseId }, include: quizInclude });
    if (!quiz) throw new NotFoundException('Đề kiểm tra không tồn tại trong khóa học này');
    return quiz;
  }

  /** Hạn chót của một lượt: hết thời lượng làm bài hoặc hạn đóng đề — tùy cái nào đến trước */
  static deadlineOf(quiz: Pick<QuizRow, 'dueAt' | 'durationMinutes'>, startedAt: Date | null): Date {
    const started = startedAt ?? new Date();
    if (!quiz.durationMinutes) return quiz.dueAt;
    const byDuration = new Date(started.getTime() + quiz.durationMinutes * 60_000);
    return byDuration < quiz.dueAt ? byDuration : quiz.dueAt;
  }

  /** Cửa sổ làm bài tại thời điểm `now` (mirror computeWindow của bài tập + số lượt) */
  static computeWindow(
    quiz: Pick<QuizRow, 'status' | 'openAt' | 'dueAt' | 'maxAttempts' | 'course' | '_count'>,
    attempts: { id: bigint; status: AttemptStatus }[],
    now = new Date(),
  ): AttemptWindow {
    const inProgress = attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);
    const attemptsUsed = attempts.length;
    const attemptsLeft = Math.max(0, quiz.maxAttempts - attemptsUsed);
    const isPastDue = now > quiz.dueAt;
    let reason: AttemptBlockReason | null = null;
    if (quiz.status === ActivityStatus.DRAFT) reason = 'DRAFT';
    else if (quiz.course.status === CourseStatus.ARCHIVED) reason = 'COURSE_ARCHIVED';
    else if (quiz.status === ActivityStatus.CLOSED) reason = 'CLOSED';
    else if (now < quiz.openAt) reason = 'NOT_OPEN';
    else if (isPastDue) reason = 'PAST_DUE';
    else if (quiz._count.quizQuestions === 0) reason = 'NO_QUESTIONS';
    else if (!inProgress && attemptsLeft === 0) reason = 'NO_ATTEMPTS_LEFT';
    return {
      canStart: reason === null,
      reason,
      isPastDue,
      attemptsUsed,
      attemptsLeft,
      inProgressAttemptId: inProgress ? inProgress.id.toString() : null,
    };
  }

  private async loadAttempt(quizId: bigint, attemptId: bigint): Promise<AttemptRow> {
    const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: attemptId }, include: attemptInclude });
    if (!attempt || attempt.quizId !== quizId) throw new NotFoundException('Lượt làm bài không tồn tại');
    return attempt;
  }

  private assertOwner(attempt: AttemptRow, studentId: bigint) {
    if (attempt.studentId !== studentId) throw new ForbiddenException('Bạn không có quyền truy cập lượt làm bài này');
  }

  /** Lượt đang làm: câu hỏi (không có đáp án đúng) + đáp án đã lưu nháp */
  private formatInProgress(quiz: QuizRow, attempt: AttemptRow) {
    const deadlineAt = QuizAttemptService.deadlineOf(quiz, attempt.startedAt);
    return {
      id: attempt.id.toString(),
      quizId: attempt.quizId.toString(),
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadlineAt,
      serverTime: new Date(),
      questions: attempt.attemptQuestions.map((q) => ({
        id: q.id.toString(),
        orderIndex: q.orderIndex,
        maxScore: q.maxScore.toFixed(2),
        snapshot: toStudentSnapshot(parseSnapshot(q.questionSnapshot)),
        selectedChoiceIds: q.attemptAnswer?.selectedChoices.map((c) => c.choiceId.toString()) ?? [],
      })),
    };
  }

  /** Kết quả lượt đã nộp — đáp án đúng chỉ lộ khi đề cho phép hoặc người xem là giáo viên */
  private formatResult(quiz: QuizRow, attempt: AttemptRow, revealAnswers: boolean) {
    const questions = attempt.attemptQuestions.map((q) => {
      const snapshot = parseSnapshot(q.questionSnapshot);
      const selected = q.attemptAnswer?.selectedChoices.map((c) => c.choiceId.toString()) ?? [];
      return {
        id: q.id.toString(),
        orderIndex: q.orderIndex,
        maxScore: q.maxScore.toFixed(2),
        snapshot: toStudentSnapshot(snapshot),
        selectedChoiceIds: selected,
        isCorrect: q.attemptAnswer?.isCorrect ?? false,
        awardedScore: fmt(q.attemptAnswer?.awardedScore) ?? '0.00',
        correctChoiceIds: revealAnswers ? snapshot.choices.filter((c) => c.isCorrect).map((c) => c.id) : undefined,
      };
    });
    const totalMax = attempt.attemptQuestions.reduce((s, q) => s.plus(q.maxScore), new Prisma.Decimal(0));
    return {
      id: attempt.id.toString(),
      quizId: attempt.quizId.toString(),
      studentId: attempt.studentId.toString(),
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      totalScore: fmt(attempt.totalScore),
      totalMaxScore: totalMax.toFixed(2),
      correctCount: questions.filter((q) => q.isCorrect).length,
      questionCount: questions.length,
      answersRevealed: revealAnswers,
      // Giáo viên không cho xem đáp án → sinh viên chỉ nhận điểm; câu hỏi và lựa chọn không rời khỏi máy chủ
      questions: revealAnswers ? questions : [],
    };
  }

  private formatSummary(attempt: {
    id: bigint;
    attemptNumber: number;
    status: AttemptStatus;
    startedAt: Date | null;
    submittedAt: Date | null;
    totalScore: Prisma.Decimal | null;
  }) {
    return {
      id: attempt.id.toString(),
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      totalScore: fmt(attempt.totalScore),
    };
  }

  /** Kiểm tra và chuẩn hóa đáp án gửi lên theo snapshot (chống chọn đáp án không thuộc câu hỏi) */
  private normalizeAnswers(attempt: AttemptRow, inputs: AttemptAnswerInputDto[]) {
    const byId = new Map(attempt.attemptQuestions.map((q) => [q.id.toString(), q]));
    return inputs.map((input) => {
      const question = byId.get(input.attemptQuestionId);
      if (!question) throw new BadRequestException('Câu hỏi không thuộc lượt làm bài này');
      const snapshot = parseSnapshot(question.questionSnapshot);
      const valid = new Set(snapshot.choices.map((c) => c.id));
      const choiceIds = [...new Set(input.choiceIds)];
      if (choiceIds.some((id) => !valid.has(id))) {
        throw new BadRequestException('Đáp án không thuộc câu hỏi này');
      }
      if (snapshot.questionType === 'SINGLE' && choiceIds.length > 1) {
        throw new BadRequestException('Câu hỏi một đáp án chỉ được chọn một lựa chọn');
      }
      return { question, choiceIds };
    });
  }

  /** Tự nộp lượt đã quá hạn khi sinh viên quay lại (không cần cron) */
  private async finalizeIfExpired(quiz: QuizRow, attempt: AttemptRow): Promise<AttemptRow> {
    if (attempt.status !== AttemptStatus.IN_PROGRESS) return attempt;
    const deadline = QuizAttemptService.deadlineOf(quiz, attempt.startedAt);
    const now = Date.now();
    // Giáo viên đã đóng đề / khóa học lưu trữ → kết thúc lượt dở ngay với đáp án đã lưu
    const forcedEnd = quiz.status === ActivityStatus.CLOSED || quiz.course.status === CourseStatus.ARCHIVED;
    if (!forcedEnd && now <= deadline.getTime() + SUBMIT_GRACE_MS) return attempt;
    await this.gradeAndFinalize(quiz, attempt, [], forcedEnd && now < deadline.getTime() ? new Date(now) : deadline);
    return this.loadAttempt(quiz.id, attempt.id);
  }

  /**
   * Sinh viên bị gỡ khỏi khóa học → chốt ngay mọi lượt đang dở của họ trong khóa (chấm với đáp án đã lưu)
   * để không còn lượt "treo" vô thời hạn; điểm vẫn được giữ như hồ sơ.
   */
  async finalizeStudentAttempts(courseId: bigint, studentId: bigint) {
    const open = await this.prisma.quizAttempt.findMany({
      where: { studentId, status: AttemptStatus.IN_PROGRESS, quiz: { courseId } },
      include: attemptInclude,
    });
    for (const attempt of open) {
      const quiz = await this.prisma.quiz.findUnique({ where: { id: attempt.quizId }, include: quizInclude });
      if (!quiz) continue;
      const deadline = QuizAttemptService.deadlineOf(quiz, attempt.startedAt);
      const now = new Date();
      await this.gradeAndFinalize(quiz, attempt, [], now < deadline ? now : deadline);
    }
    return open.length;
  }

  /**
   * Chốt mọi lượt dở của một đề đã quá hạn / đã đóng (gọi khi giáo viên đóng đề và trước khi lập bảng kết quả)
   * để bảng của giáo viên không hiện "Đang làm" với lượt đã hết giờ mà sinh viên không quay lại.
   */
  async finalizeOpenAttempts(quizId: bigint) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: quizInclude });
    if (!quiz) return 0;
    const open = await this.prisma.quizAttempt.findMany({
      where: { quizId, status: AttemptStatus.IN_PROGRESS },
      include: attemptInclude,
    });
    let finalized = 0;
    for (const attempt of open) {
      const after = await this.finalizeIfExpired(quiz, attempt);
      if (after.status !== AttemptStatus.IN_PROGRESS) finalized++;
    }
    return finalized;
  }

  /**
   * Chấm toàn bộ câu từ snapshot đã đóng băng + ghi điểm sổ trong một transaction.
   * `submittedAt` = thời điểm nộp thật, hoặc hạn chót nếu hệ thống tự nộp.
   */
  private async gradeAndFinalize(
    quiz: QuizRow,
    attempt: AttemptRow,
    finalAnswers: { question: AttemptRow['attemptQuestions'][number]; choiceIds: string[] }[],
    submittedAt: Date,
  ) {
    const overrides = new Map(finalAnswers.map((a) => [a.question.id, a.choiceIds]));
    await this.prisma.$transaction(async (tx) => {
      // Chỉ lượt đang làm mới được chốt — chặn nộp hai lần (idempotent)
      const locked = await tx.quizAttempt.updateMany({
        where: { id: attempt.id, status: AttemptStatus.IN_PROGRESS },
        data: { status: AttemptStatus.SUBMITTED, submittedAt },
      });
      if (locked.count === 0) return;

      let total = new Prisma.Decimal(0);
      for (const q of attempt.attemptQuestions) {
        const selected =
          overrides.get(q.id) ?? q.attemptAnswer?.selectedChoices.map((c) => c.choiceId.toString()) ?? [];
        const { isCorrect, awardedScore } = gradeQuestion(parseSnapshot(q.questionSnapshot), selected, q.maxScore);
        total = total.plus(awardedScore);
        const answer = await tx.attemptAnswer.upsert({
          where: { attemptQuestionId: q.id },
          create: { attemptQuestionId: q.id, isCorrect, awardedScore },
          update: { isCorrect, awardedScore },
          select: { id: true },
        });
        if (overrides.has(q.id)) {
          await tx.attemptAnswerChoice.deleteMany({ where: { attemptAnswerId: answer.id } });
          if (selected.length) {
            await tx.attemptAnswerChoice.createMany({
              data: selected.map((choiceId) => ({ attemptAnswerId: answer.id, choiceId: BigInt(choiceId) })),
            });
          }
        }
      }

      await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: { status: AttemptStatus.GRADED, totalScore: total, gradedAt: new Date() },
      });
      if (quiz.scoringEnabled) await this.gradeSync.syncStudentGrade(quiz.id, attempt.studentId, tx);
    });
  }

  // ===========================================================================
  // SINH VIÊN
  // ===========================================================================

  /** Trang đề kiểm tra: các lượt của tôi, cửa sổ làm bài, điểm ghi sổ theo chính sách */
  async getMyAttempts(courseId: bigint, quizId: bigint, studentId: bigint) {
    const quiz = await this.loadQuiz(courseId, quizId);
    if (quiz.status === ActivityStatus.DRAFT) {
      throw new ForbiddenException('Sinh viên không có quyền xem đề kiểm tra đang ở trạng thái nháp');
    }
    let attempts = await this.prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      orderBy: { attemptNumber: 'asc' },
      include: attemptInclude,
    });
    // Lượt dở dang đã hết giờ → chốt ngay để trạng thái hiển thị đúng
    for (const a of attempts) {
      if (a.status === AttemptStatus.IN_PROGRESS) await this.finalizeIfExpired(quiz, a);
    }
    attempts = await this.prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      orderBy: { attemptNumber: 'asc' },
      include: attemptInclude,
    });

    const window = QuizAttemptService.computeWindow(quiz, attempts);
    const gradeScore = aggregateAttemptScores(quiz.attemptGrading, attempts);
    const inProgress = attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);
    return {
      attempts: attempts.map((a) => this.formatSummary(a)),
      window,
      gradeScore: fmt(gradeScore),
      attemptGrading: quiz.attemptGrading,
      inProgressDeadlineAt: inProgress ? QuizAttemptService.deadlineOf(quiz, inProgress.startedAt) : null,
      serverTime: new Date(),
    };
  }

  /** Bắt đầu lượt mới (hoặc trả lại lượt đang dở) — snapshot đề vào AttemptQuestion */
  async start(courseId: bigint, quizId: bigint, studentId: bigint): Promise<ReturnType<QuizAttemptService['formatInProgress']>> {
    const quiz = await this.loadQuiz(courseId, quizId);
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      select: { id: true, status: true },
    });
    const window = QuizAttemptService.computeWindow(quiz, attempts);
    if (window.inProgressAttemptId) {
      const existing = await this.loadAttempt(quizId, BigInt(window.inProgressAttemptId));
      const finalized = await this.finalizeIfExpired(quiz, existing);
      if (finalized.status === AttemptStatus.IN_PROGRESS) return this.formatInProgress(quiz, finalized);
      // Lượt dở đã tự nộp → tính lại cửa sổ với trạng thái mới
      return this.start(courseId, quizId, studentId);
    }
    if (!window.canStart) {
      if (window.reason === 'DRAFT') throw new ForbiddenException(BLOCK_MESSAGES.DRAFT);
      throw new ConflictException(BLOCK_MESSAGES[window.reason!]);
    }

    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, maxScore: true, questionSnapshot: true },
    });
    const ordered = quiz.shuffleQuestions ? shuffle(questions) : questions;
    const startedAt = new Date();

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const attempt = await tx.quizAttempt.create({
          data: {
            quizId,
            studentId,
            attemptNumber: attempts.length + 1,
            status: AttemptStatus.IN_PROGRESS,
            startedAt,
          },
          select: { id: true },
        });
        await tx.attemptQuestion.createMany({
          data: ordered.map((q, i) => {
            const snapshot = parseSnapshot(q.questionSnapshot);
            const choices = quiz.shuffleChoices ? shuffle(snapshot.choices) : snapshot.choices;
            return {
              attemptId: attempt.id,
              quizQuestionId: q.id,
              orderIndex: i + 1,
              maxScore: q.maxScore,
              questionSnapshot: JSON.parse(JSON.stringify({ ...snapshot, choices })) as Prisma.InputJsonValue,
            };
          }),
        });
        return attempt;
      });
      return this.formatInProgress(quiz, await this.loadAttempt(quizId, created.id));
    } catch (error) {
      // Hai yêu cầu bắt đầu cùng lúc → unique (quizId, studentId, attemptNumber) chặn lượt trùng
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Bạn đang có một lượt làm bài khác, vui lòng tải lại trang');
      }
      throw error;
    }
  }

  /** Lấy lượt đang làm (tiếp tục sau khi tải lại trang); lượt đã nộp → kết quả */
  async getAttempt(courseId: bigint, quizId: bigint, attemptId: bigint, studentId: bigint) {
    const quiz = await this.loadQuiz(courseId, quizId);
    let attempt = await this.loadAttempt(quizId, attemptId);
    this.assertOwner(attempt, studentId);
    attempt = await this.finalizeIfExpired(quiz, attempt);
    if (attempt.status === AttemptStatus.IN_PROGRESS) return { mode: 'IN_PROGRESS' as const, attempt: this.formatInProgress(quiz, attempt) };
    return { mode: 'RESULT' as const, attempt: this.formatResult(quiz, attempt, quiz.showAnswersAfterSubmit) };
  }

  /** Lưu nháp đáp án (gọi mỗi khi sinh viên đổi lựa chọn) */
  async saveAnswers(courseId: bigint, quizId: bigint, attemptId: bigint, studentId: bigint, inputs: AttemptAnswerInputDto[]) {
    const quiz = await this.loadQuiz(courseId, quizId);
    let attempt = await this.loadAttempt(quizId, attemptId);
    this.assertOwner(attempt, studentId);
    attempt = await this.finalizeIfExpired(quiz, attempt);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException('Lượt làm bài đã kết thúc, không thể lưu thêm đáp án');
    }
    const deadlineAt = QuizAttemptService.deadlineOf(quiz, attempt.startedAt);
    const answers = this.normalizeAnswers(attempt, inputs);

    await this.prisma.$transaction(async (tx) => {
      for (const { question, choiceIds } of answers) {
        const answer = await tx.attemptAnswer.upsert({
          where: { attemptQuestionId: question.id },
          create: { attemptQuestionId: question.id },
          update: { answeredAt: new Date() },
          select: { id: true },
        });
        await tx.attemptAnswerChoice.deleteMany({ where: { attemptAnswerId: answer.id } });
        if (choiceIds.length) {
          await tx.attemptAnswerChoice.createMany({
            data: choiceIds.map((choiceId) => ({ attemptAnswerId: answer.id, choiceId: BigInt(choiceId) })),
          });
        }
      }
    });
    return { saved: answers.length, deadlineAt, serverTime: new Date() };
  }

  /** Nộp bài: chốt đáp án cuối (nếu gửi kèm), chấm tự động, ghi điểm sổ */
  async submit(courseId: bigint, quizId: bigint, attemptId: bigint, studentId: bigint, dto: SubmitAttemptDto) {
    const quiz = await this.loadQuiz(courseId, quizId);
    const attempt = await this.loadAttempt(quizId, attemptId);
    this.assertOwner(attempt, studentId);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      // Đã nộp trước đó (bấm hai lần / mất mạng) → trả lại kết quả, không lỗi
      return this.formatResult(quiz, attempt, quiz.showAnswersAfterSubmit);
    }
    const deadlineAt = QuizAttemptService.deadlineOf(quiz, attempt.startedAt);
    const now = new Date();
    const withinGrace = now.getTime() <= deadlineAt.getTime() + SUBMIT_GRACE_MS;
    // Quá hạn + thời gian nới: chỉ chấm những gì đã lưu nháp, bỏ qua đáp án gửi muộn
    const finalAnswers = withinGrace && dto.answers?.length ? this.normalizeAnswers(attempt, dto.answers) : [];
    await this.gradeAndFinalize(quiz, attempt, finalAnswers, withinGrace ? now : deadlineAt);
    const graded = await this.loadAttempt(quizId, attemptId);
    return this.formatResult(quiz, graded, quiz.showAnswersAfterSubmit);
  }

  /** Kết quả một lượt — sinh viên (chủ lượt) hoặc giáo viên phụ trách / admin (luôn thấy đáp án) */
  async getResult(courseId: bigint, quizId: bigint, attemptId: bigint, viewer: Viewer) {
    const quiz = await this.loadQuiz(courseId, quizId);
    let attempt = await this.loadAttempt(quizId, attemptId);
    const isTeacher = viewer.role === UserRole.TEACHER || viewer.role === UserRole.ADMIN;
    if (!isTeacher) {
      this.assertOwner(attempt, viewer.id);
      attempt = await this.finalizeIfExpired(quiz, attempt);
    }
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new ConflictException('Lượt làm bài chưa được nộp');
    }
    const result = this.formatResult(quiz, attempt, isTeacher || quiz.showAnswersAfterSubmit);
    if (!isTeacher) return result;
    const student = await this.prisma.user.findUnique({ where: { id: attempt.studentId }, select: studentSelect });
    return {
      ...result,
      student: student && { ...student, id: student.id.toString() },
    };
  }

  // ===========================================================================
  // GIÁO VIÊN
  // ===========================================================================

  /** Bảng lượt làm bài theo từng sinh viên đang tham gia khóa học */
  async listForTeacher(courseId: bigint, quizId: bigint) {
    const quiz = await this.loadQuiz(courseId, quizId);
    await this.finalizeOpenAttempts(quizId);
    const [enrollments, attempts, grades] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId, status: EnrollmentStatus.ACTIVE },
        select: { student: { select: studentSelect } },
        orderBy: { student: { fullName: 'asc' } },
      }),
      this.prisma.quizAttempt.findMany({
        where: { quizId },
        orderBy: { attemptNumber: 'asc' },
        select: { id: true, studentId: true, attemptNumber: true, status: true, startedAt: true, submittedAt: true, totalScore: true },
      }),
      quiz.gradeItem
        ? this.prisma.grade.findMany({ where: { gradeItemId: quiz.gradeItem.id }, select: { studentId: true, score: true } })
        : Promise.resolve([]),
    ]);
    const gradeByStudent = new Map(grades.map((g) => [g.studentId, g.score]));
    const byStudent = new Map<bigint, typeof attempts>();
    for (const a of attempts) byStudent.set(a.studentId, [...(byStudent.get(a.studentId) ?? []), a]);

    const rows = enrollments.map(({ student }) => {
      const mine = byStudent.get(student.id) ?? [];
      const inProgress = mine.some((a) => a.status === AttemptStatus.IN_PROGRESS);
      const finished = mine.filter((a) => a.status === AttemptStatus.GRADED);
      return {
        student: { ...student, id: student.id.toString() },
        attempts: mine.map((a) => this.formatSummary(a)),
        attemptCount: mine.length,
        inProgress,
        bestScore: fmt(aggregateAttemptScores('HIGHEST', finished)),
        latestScore: fmt(finished.length ? finished[finished.length - 1].totalScore : null),
        gradeScore: fmt(gradeByStudent.get(student.id) ?? aggregateAttemptScores(quiz.attemptGrading, finished)),
        lastSubmittedAt: finished.length ? finished[finished.length - 1].submittedAt : null,
      };
    });
    const attempted = rows.filter((r) => r.attemptCount > 0);
    const scores = rows.map((r) => r.gradeScore).filter((s): s is string => s !== null).map(Number);
    return {
      summary: {
        enrolled: rows.length,
        attempted: attempted.length,
        notAttempted: rows.length - attempted.length,
        inProgress: rows.filter((r) => r.inProgress).length,
        averageScore: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null,
      },
      window: QuizAttemptService.computeWindow(quiz, []),
      attemptGrading: quiz.attemptGrading,
      totalMaxScore: fmt(quiz.gradeItem?.maxScore) ?? null,
      rows,
    };
  }
}
