import { apiFetch } from './http-client';
import type {
  MySubmissionResponse,
  SubmissionDto,
  TeacherSubmissionListResponse,
} from '../types/submission';

interface ApiEnvelope<T> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: T;
}

function unwrap<T>(res: ApiEnvelope<T> | T): T {
  if (res && typeof res === 'object' && 'data' in res && (res as ApiEnvelope<T>).data !== undefined) {
    return (res as ApiEnvelope<T>).data;
  }
  return res as T;
}

const base = (courseId: string, assignmentId: string) => `/courses/${courseId}/assignments/${assignmentId}`;

/** Bài nộp của chính sinh viên + cửa sổ nộp + quy tắc tệp */
export async function fetchMySubmission(courseId: string, assignmentId: string): Promise<MySubmissionResponse> {
  const res = await apiFetch<ApiEnvelope<MySubmissionResponse>>(`${base(courseId, assignmentId)}/submission`, {
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

export interface SaveSubmissionInput {
  /** HTML bài làm trực tuyến (bỏ trống nếu không dùng) */
  content?: string;
  /** Tệp mới (thay thế tệp cũ) */
  file?: File | null;
  /** Gỡ tệp đã đính kèm trước đó */
  removeFile?: boolean;
}

/** Nộp bài lần đầu hoặc lưu chỉnh sửa (upsert) — multipart/form-data */
export async function saveSubmission(
  courseId: string,
  assignmentId: string,
  input: SaveSubmissionInput,
): Promise<SubmissionDto> {
  const form = new FormData();
  if (input.content !== undefined) form.append('content', input.content);
  if (input.file) form.append('file', input.file);
  if (input.removeFile) form.append('removeFile', 'true');
  const res = await apiFetch<ApiEnvelope<SubmissionDto>>(`${base(courseId, assignmentId)}/submission`, {
    method: 'PUT',
    body: form,
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

/** Loại bỏ bài nộp — trở về trạng thái chưa nộp */
export async function removeSubmission(courseId: string, assignmentId: string): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>(
    `${base(courseId, assignmentId)}/submission`,
    { method: 'DELETE', skipAuthRedirect: true },
  );
  return unwrap(res);
}

/** Giáo viên: danh sách bài nộp theo từng sinh viên */
export async function fetchAssignmentSubmissions(
  courseId: string,
  assignmentId: string,
): Promise<TeacherSubmissionListResponse> {
  const res = await apiFetch<ApiEnvelope<TeacherSubmissionListResponse>>(`${base(courseId, assignmentId)}/submissions`, {
    skipAuthRedirect: true,
  });
  return unwrap(res);
}
