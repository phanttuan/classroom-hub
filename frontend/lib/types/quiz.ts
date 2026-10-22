export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type QuestionTypeKey = 'SINGLE' | 'MULTIPLE';
/** Cách tính điểm vào sổ khi được làm nhiều lượt */
export type AttemptGradingMethod = 'HIGHEST' | 'LATEST' | 'AVERAGE';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';

/** Tóm tắt lượt làm của chính sinh viên gắn kèm đề (danh sách trên trang khóa học) */
export interface QuizMyAttemptsDto {
  count: number;
  inProgressAttemptId: string | null;
  latestScore: string | null;
  bestScore: string | null;
  /** Điểm theo cách tính của đề (khớp điểm sổ) */
  gradeScore: string | null;
}

/** Lựa chọn đáp án được sao lưu trong snapshot của đề kiểm tra */
export interface QuizSnapshotChoice {
  id: string;
  content: string;
  isCorrect: boolean;
  orderIndex: number;
}

/** Snapshot câu hỏi tại thời điểm thêm vào đề — giáo viên thấy đáp án đúng, học sinh không nhận trường này */
export interface QuizQuestionSnapshot {
  questionId: string;
  questionKey?: string;
  version?: number;
  content: string;
  questionType: QuestionTypeKey;
  defaultScore?: string;
  choices: QuizSnapshotChoice[];
}

export interface QuizQuestionDto {
  id: string;
  quizId: string;
  questionId: string;
  orderIndex: number;
  maxScore: string;
  questionSnapshot: QuizQuestionSnapshot;
  createdAt: string;
}

export interface QuizAttemptStatsDto {
  submitted: number;
  total: number;
}

/**
 * Đề kiểm tra trả về từ /courses/:courseId/quizzes.
 * `questions` chỉ xuất hiện với giáo viên — học sinh không bao giờ nhận mảng này.
 */
export interface QuizDto {
  id: string;
  courseId: string;
  moduleId: string;
  createdBy: string;
  title: string;
  instructions?: string | null;
  openAt: string;
  dueAt: string;
  durationMinutes?: number | null;
  maxAttempts: number;
  scoringEnabled: boolean;
  showAnswersAfterSubmit: boolean;
  attemptGrading: AttemptGradingMethod;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  status: QuizStatus;
  publishedAt?: string | null;
  gradeItemId?: string | null;
  totalMaxScore: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  attemptStats?: QuizAttemptStatsDto;
  myAttempts?: QuizMyAttemptsDto | null;
  questions?: QuizQuestionDto[];
}

/* =========================================================================
 * LƯỢT LÀM BÀI (CH-106 / CH-107)
 * ========================================================================= */

export type AttemptBlockReason =
  | 'DRAFT'
  | 'CLOSED'
  | 'NOT_OPEN'
  | 'PAST_DUE'
  | 'COURSE_ARCHIVED'
  | 'NO_QUESTIONS'
  | 'NO_ATTEMPTS_LEFT';

export interface AttemptWindowDto {
  canStart: boolean;
  reason: AttemptBlockReason | null;
  isPastDue: boolean;
  attemptsUsed: number;
  attemptsLeft: number;
  inProgressAttemptId: string | null;
}

export interface AttemptSummaryDto {
  id: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string | null;
  submittedAt: string | null;
  totalScore: string | null;
}

/** GET …/attempts/me */
export interface MyQuizAttemptsResponse {
  attempts: AttemptSummaryDto[];
  window: AttemptWindowDto;
  gradeScore: string | null;
  attemptGrading: AttemptGradingMethod;
  inProgressDeadlineAt: string | null;
  serverTime: string;
}

/** Câu hỏi trong lượt — snapshot gửi cho sinh viên KHÔNG có isCorrect */
export interface AttemptQuestionDto {
  id: string;
  orderIndex: number;
  maxScore: string;
  snapshot: {
    questionId: string;
    content: string;
    questionType: QuestionTypeKey;
    choices: { id: string; content: string; orderIndex: number }[];
  };
  selectedChoiceIds: string[];
}

/** Lượt đang làm (POST …/attempts, GET …/attempts/:id mode IN_PROGRESS) */
export interface AttemptInProgressDto {
  id: string;
  quizId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  deadlineAt: string;
  serverTime: string;
  questions: AttemptQuestionDto[];
}

export interface AttemptResultQuestionDto extends AttemptQuestionDto {
  isCorrect: boolean;
  awardedScore: string;
  /** Chỉ có khi đề cho xem đáp án hoặc người xem là giáo viên */
  correctChoiceIds?: string[];
}

/** Kết quả lượt đã nộp */
export interface AttemptResultDto {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string | null;
  submittedAt: string | null;
  totalScore: string | null;
  totalMaxScore: string;
  correctCount: number;
  questionCount: number;
  answersRevealed: boolean;
  questions: AttemptResultQuestionDto[];
  /** Chỉ có khi giáo viên xem */
  student?: { id: string; fullName: string; email: string; avatarUrl?: string | null } | null;
}

export type AttemptGetResponse =
  | { mode: 'IN_PROGRESS'; attempt: AttemptInProgressDto }
  | { mode: 'RESULT'; attempt: AttemptResultDto };

export interface AttemptAnswerInput {
  attemptQuestionId: string;
  choiceIds: string[];
}

export interface TeacherAttemptRowDto {
  student: { id: string; fullName: string; email: string; avatarUrl?: string | null };
  attempts: AttemptSummaryDto[];
  attemptCount: number;
  inProgress: boolean;
  bestScore: string | null;
  latestScore: string | null;
  gradeScore: string | null;
  lastSubmittedAt: string | null;
}

/** GET …/attempts (giáo viên) */
export interface TeacherAttemptListResponse {
  summary: {
    enrolled: number;
    attempted: number;
    notAttempted: number;
    inProgress: number;
    averageScore: string | null;
  };
  window: AttemptWindowDto;
  attemptGrading: AttemptGradingMethod;
  totalMaxScore: string | null;
  rows: TeacherAttemptRowDto[];
}

export interface CreateQuizPayload {
  moduleId: string;
  title: string;
  instructions?: string;
  openAt: string;
  dueAt: string;
  durationMinutes?: number;
  maxAttempts?: number;
  scoringEnabled?: boolean;
  showAnswersAfterSubmit?: boolean;
  attemptGrading?: AttemptGradingMethod;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
}

export interface UpdateQuizPayload {
  moduleId?: string;
  title?: string;
  instructions?: string;
  openAt?: string;
  dueAt?: string;
  durationMinutes?: number;
  maxAttempts?: number;
  scoringEnabled?: boolean;
  showAnswersAfterSubmit?: boolean;
  attemptGrading?: AttemptGradingMethod;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
}

export interface AddQuizQuestionPayload {
  questionId: string;
  maxScore?: number;
}

/* =========================================================================
 * NGÂN HÀNG CÂU HỎI (CH-105)
 * ========================================================================= */

export interface QuestionBankChoiceDto {
  id: string;
  content: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface QuestionSetDto {
  id: string;
  ownerId: string;
  name: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionBankQuestionDto {
  id: string;
  ownerId: string;
  setId: string | null;
  setName: string | null;
  questionKey: string;
  content: string;
  questionType: QuestionTypeKey;
  defaultScore: string;
  version: number;
  status: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  choices: QuestionBankChoiceDto[];
}

export interface CreateQuestionPayload {
  content: string;
  questionType: QuestionTypeKey;
  defaultScore?: number;
  setId?: string;
  choices: Array<{ content: string; isCorrect: boolean }>;
}

export interface UpdateQuestionPayload {
  content?: string;
  questionType?: QuestionTypeKey;
  defaultScore?: number;
  /** null = chuyển về "Chưa phân bộ" */
  setId?: string | null;
  choices?: Array<{ content: string; isCorrect: boolean }>;
}
