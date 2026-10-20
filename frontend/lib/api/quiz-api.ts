import { apiFetch } from './http-client';
import type {
  AddQuizQuestionPayload,
  CreateQuestionPayload,
  CreateQuizPayload,
  QuestionBankQuestionDto,
  QuestionTypeKey,
  QuizDto,
  QuizQuestionDto,
  QuizStatus,
  UpdateQuizPayload,
} from '../types/quiz';

interface ApiEnvelope<T> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: T;
}

function unwrap<T>(res: ApiEnvelope<T> | T): T {
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    (res as ApiEnvelope<T>).data !== undefined
  ) {
    return (res as ApiEnvelope<T>).data;
  }
  return res as T;
}

/** Thông báo lỗi tiếng Việt thân thiện cho các mã 400/403/404/409 của API đề kiểm tra. */
export function formatQuizApiError(
  err: unknown,
  fallback = 'Không thể thực hiện thao tác với đề kiểm tra. Vui lòng thử lại.',
): string {
  const rawMessage = err instanceof Error ? err.message.trim() : '';
  if (!rawMessage) return fallback;

  if (rawMessage.includes('HTTP Error 403') || rawMessage.includes('403')) {
    return 'Bạn không có quyền thực hiện thao tác này với đề kiểm tra.';
  }
  if (rawMessage.includes('HTTP Error 404') || rawMessage.includes('404')) {
    return 'Không tìm thấy đề kiểm tra hoặc khóa học tương ứng.';
  }
  if (rawMessage.includes('HTTP Error 409')) {
    return 'Đề kiểm tra đã xuất bản/đóng nên không thể thay đổi. Chỉ đề nháp mới được chỉnh sửa.';
  }
  if (rawMessage.includes('HTTP Error 400')) {
    return 'Dữ liệu đề kiểm tra không hợp lệ. Vui lòng kiểm tra lại thời gian, topic và điểm số.';
  }

  return rawMessage;
}

// =========================================================================
// QUIZ
// =========================================================================

export async function fetchCourseQuizzes(
  courseId: string,
  status?: QuizStatus,
  moduleId?: string,
): Promise<QuizDto[]> {
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (moduleId) query.set('moduleId', moduleId);
  const qs = query.toString();

  const res = await apiFetch<ApiEnvelope<QuizDto[]> | QuizDto[]>(
    `/courses/${courseId}/quizzes${qs ? `?${qs}` : ''}`,
    { skipAuthRedirect: true },
  );
  return unwrap(res);
}

export async function fetchQuizDetail(
  courseId: string,
  quizId: string,
): Promise<QuizDto> {
  const res = await apiFetch<ApiEnvelope<QuizDto> | QuizDto>(
    `/courses/${courseId}/quizzes/${quizId}`,
    { skipAuthRedirect: true },
  );
  return unwrap(res);
}

export async function createQuiz(
  courseId: string,
  payload: CreateQuizPayload,
): Promise<QuizDto> {
  const res = await apiFetch<ApiEnvelope<QuizDto> | QuizDto>(
    `/courses/${courseId}/quizzes`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function updateQuiz(
  courseId: string,
  quizId: string,
  payload: UpdateQuizPayload,
): Promise<QuizDto> {
  const res = await apiFetch<ApiEnvelope<QuizDto> | QuizDto>(
    `/courses/${courseId}/quizzes/${quizId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function publishQuiz(
  courseId: string,
  quizId: string,
): Promise<QuizDto> {
  const res = await apiFetch<ApiEnvelope<QuizDto> | QuizDto>(
    `/courses/${courseId}/quizzes/${quizId}/publish`,
    { method: 'POST', skipAuthRedirect: true },
  );
  return unwrap(res);
}

export async function closeQuiz(
  courseId: string,
  quizId: string,
): Promise<QuizDto> {
  const res = await apiFetch<ApiEnvelope<QuizDto> | QuizDto>(
    `/courses/${courseId}/quizzes/${quizId}/close`,
    { method: 'POST', skipAuthRedirect: true },
  );
  return unwrap(res);
}

export async function deleteQuiz(
  courseId: string,
  quizId: string,
): Promise<{ id: string }> {
  const res = await apiFetch<ApiEnvelope<{ id: string }> | { id: string }>(
    `/courses/${courseId}/quizzes/${quizId}`,
    { method: 'DELETE', skipAuthRedirect: true },
  );
  return unwrap(res);
}

// =========================================================================
// QUIZ QUESTIONS
// =========================================================================

export async function addQuizQuestion(
  courseId: string,
  quizId: string,
  payload: AddQuizQuestionPayload,
): Promise<QuizQuestionDto> {
  const res = await apiFetch<ApiEnvelope<QuizQuestionDto> | QuizQuestionDto>(
    `/courses/${courseId}/quizzes/${quizId}/questions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function updateQuizQuestion(
  courseId: string,
  quizId: string,
  quizQuestionId: string,
  maxScore: number,
): Promise<QuizQuestionDto> {
  const res = await apiFetch<ApiEnvelope<QuizQuestionDto> | QuizQuestionDto>(
    `/courses/${courseId}/quizzes/${quizId}/questions/${quizQuestionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ maxScore }),
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function removeQuizQuestion(
  courseId: string,
  quizId: string,
  quizQuestionId: string,
): Promise<{ id: string }> {
  const res = await apiFetch<ApiEnvelope<{ id: string }> | { id: string }>(
    `/courses/${courseId}/quizzes/${quizId}/questions/${quizQuestionId}`,
    { method: 'DELETE', skipAuthRedirect: true },
  );
  return unwrap(res);
}

// =========================================================================
// NGÂN HÀNG CÂU HỎI (CH-105)
// =========================================================================

export async function fetchQuestionBank(
  search?: string,
  questionType?: QuestionTypeKey,
): Promise<QuestionBankQuestionDto[]> {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  if (questionType) query.set('questionType', questionType);
  const qs = query.toString();

  const res = await apiFetch<
    ApiEnvelope<QuestionBankQuestionDto[]> | QuestionBankQuestionDto[]
  >(`/question-bank${qs ? `?${qs}` : ''}`, { skipAuthRedirect: true });
  return unwrap(res);
}

export async function createQuestionBankQuestion(
  payload: CreateQuestionPayload,
): Promise<QuestionBankQuestionDto> {
  const res = await apiFetch<
    ApiEnvelope<QuestionBankQuestionDto> | QuestionBankQuestionDto
  >('/question-bank', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRedirect: true,
  });
  return unwrap(res);
}
