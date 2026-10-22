import { apiFetch } from './http-client';
import type {
  AddQuizQuestionPayload,
  AttemptAnswerInput,
  AttemptGetResponse,
  AttemptInProgressDto,
  AttemptResultDto,
  MyQuizAttemptsResponse,
  TeacherAttemptListResponse,
  CreateQuestionPayload,
  CreateQuizPayload,
  QuestionBankQuestionDto,
  QuestionSetDto,
  QuestionTypeKey,
  QuizDto,
  QuizQuestionDto,
  QuizStatus,
  UpdateQuestionPayload,
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
  filters?: { setId?: string; unfiled?: boolean },
): Promise<QuestionBankQuestionDto[]> {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  if (questionType) query.set('questionType', questionType);
  if (filters?.setId) query.set('setId', filters.setId);
  if (filters?.unfiled) query.set('unfiled', 'true');
  const qs = query.toString();

  const res = await apiFetch<
    ApiEnvelope<QuestionBankQuestionDto[]> | QuestionBankQuestionDto[]
  >(`/question-bank${qs ? `?${qs}` : ''}`, { skipAuthRedirect: true });
  return unwrap(res);
}

export async function fetchQuestionBankQuestion(
  id: string,
): Promise<QuestionBankQuestionDto> {
  const res = await apiFetch<
    ApiEnvelope<QuestionBankQuestionDto> | QuestionBankQuestionDto
  >(`/question-bank/${id}`, { skipAuthRedirect: true });
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

export async function updateQuestionBankQuestion(
  id: string,
  payload: UpdateQuestionPayload,
): Promise<QuestionBankQuestionDto> {
  const res = await apiFetch<
    ApiEnvelope<QuestionBankQuestionDto> | QuestionBankQuestionDto
  >(`/question-bank/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

export async function deleteQuestionBankQuestion(
  id: string,
): Promise<{ id: string }> {
  const res = await apiFetch<ApiEnvelope<{ id: string }> | { id: string }>(
    `/question-bank/${id}`,
    { method: 'DELETE', skipAuthRedirect: true },
  );
  return unwrap(res);
}

export async function fetchQuestionSets(): Promise<QuestionSetDto[]> {
  const res = await apiFetch<ApiEnvelope<QuestionSetDto[]> | QuestionSetDto[]>(
    '/question-bank/sets',
    { skipAuthRedirect: true },
  );
  return unwrap(res);
}

export async function createQuestionSet(name: string): Promise<QuestionSetDto> {
  const res = await apiFetch<ApiEnvelope<QuestionSetDto> | QuestionSetDto>(
    '/question-bank/sets',
    {
      method: 'POST',
      body: JSON.stringify({ name }),
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function renameQuestionSet(
  id: string,
  name: string,
): Promise<QuestionSetDto> {
  const res = await apiFetch<ApiEnvelope<QuestionSetDto> | QuestionSetDto>(
    `/question-bank/sets/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function deleteQuestionSet(
  id: string,
): Promise<{ id: string }> {
  const res = await apiFetch<ApiEnvelope<{ id: string }> | { id: string }>(
    `/question-bank/sets/${id}`,
    { method: 'DELETE', skipAuthRedirect: true },
  );
  return unwrap(res);
}

/* =========================================================================
 * LƯỢT LÀM BÀI (CH-106 / CH-107)
 * ========================================================================= */

const attemptsBase = (courseId: string, quizId: string) => `/courses/${courseId}/quizzes/${quizId}/attempts`;

/** Sinh viên: các lượt của tôi + cửa sổ làm bài + điểm ghi sổ */
export async function fetchMyQuizAttempts(courseId: string, quizId: string): Promise<MyQuizAttemptsResponse> {
  const res = await apiFetch<ApiEnvelope<MyQuizAttemptsResponse>>(`${attemptsBase(courseId, quizId)}/me`, {
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

/** Sinh viên: bắt đầu lượt mới (hoặc nhận lại lượt đang dở) */
export async function startQuizAttempt(courseId: string, quizId: string): Promise<AttemptInProgressDto> {
  const res = await apiFetch<ApiEnvelope<AttemptInProgressDto>>(attemptsBase(courseId, quizId), {
    method: 'POST',
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

/** Sinh viên: lượt đang làm (tiếp tục) hoặc kết quả nếu đã nộp */
export async function fetchQuizAttempt(courseId: string, quizId: string, attemptId: string): Promise<AttemptGetResponse> {
  const res = await apiFetch<ApiEnvelope<AttemptGetResponse>>(`${attemptsBase(courseId, quizId)}/${attemptId}`, {
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

/** Sinh viên: lưu nháp đáp án */
export async function saveQuizAnswers(
  courseId: string,
  quizId: string,
  attemptId: string,
  answers: AttemptAnswerInput[],
): Promise<{ saved: number; deadlineAt: string; serverTime: string }> {
  const res = await apiFetch<ApiEnvelope<{ saved: number; deadlineAt: string; serverTime: string }>>(
    `${attemptsBase(courseId, quizId)}/${attemptId}/answers`,
    { method: 'PATCH', body: JSON.stringify({ answers }), skipAuthRedirect: true },
  );
  return unwrap(res);
}

/** Sinh viên: nộp bài (có thể kèm đáp án cuối) — chấm tự động ngay */
export async function submitQuizAttempt(
  courseId: string,
  quizId: string,
  attemptId: string,
  answers?: AttemptAnswerInput[],
): Promise<AttemptResultDto> {
  const res = await apiFetch<ApiEnvelope<AttemptResultDto>>(`${attemptsBase(courseId, quizId)}/${attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify(answers ? { answers } : {}),
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

/** Kết quả một lượt — sinh viên (chủ lượt) hoặc giáo viên */
export async function fetchQuizAttemptResult(courseId: string, quizId: string, attemptId: string): Promise<AttemptResultDto> {
  const res = await apiFetch<ApiEnvelope<AttemptResultDto>>(`${attemptsBase(courseId, quizId)}/${attemptId}/result`, {
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

/** Giáo viên: bảng lượt làm bài theo sinh viên */
export async function fetchQuizAttempts(courseId: string, quizId: string): Promise<TeacherAttemptListResponse> {
  const res = await apiFetch<ApiEnvelope<TeacherAttemptListResponse>>(attemptsBase(courseId, quizId), {
    skipAuthRedirect: true,
  });
  return unwrap(res);
}
