export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type QuestionTypeKey = 'SINGLE' | 'MULTIPLE';

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
  status: QuizStatus;
  publishedAt?: string | null;
  gradeItemId?: string | null;
  totalMaxScore: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  attemptStats?: QuizAttemptStatsDto;
  questions?: QuizQuestionDto[];
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

export interface QuestionBankQuestionDto {
  id: string;
  ownerId: string;
  questionKey: string;
  content: string;
  questionType: QuestionTypeKey;
  defaultScore: string;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  choices: QuestionBankChoiceDto[];
}

export interface CreateQuestionPayload {
  content: string;
  questionType: QuestionTypeKey;
  defaultScore?: number;
  choices: Array<{ content: string; isCorrect: boolean }>;
}
