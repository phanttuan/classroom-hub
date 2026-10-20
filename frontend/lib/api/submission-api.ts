import { apiFetch, apiFetchRaw } from './http-client';
import type {
  GradeSubmissionPayload,
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
  /** HTML bài làm văn bản (bỏ trống nếu không dùng) */
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

/** Giáo viên: chi tiết một bài nộp */
export async function fetchSubmissionDetail(
  courseId: string,
  assignmentId: string,
  submissionId: string,
): Promise<SubmissionDto> {
  const res = await apiFetch<ApiEnvelope<SubmissionDto>>(`${base(courseId, assignmentId)}/submissions/${submissionId}`, {
    skipAuthRedirect: true,
  });
  return unwrap(res);
}

/** Giáo viên: chấm điểm / chấm lại (idempotent) */
export async function gradeSubmission(
  courseId: string,
  assignmentId: string,
  submissionId: string,
  payload: GradeSubmissionPayload,
): Promise<SubmissionDto> {
  const res = await apiFetch<ApiEnvelope<SubmissionDto>>(
    `${base(courseId, assignmentId)}/submissions/${submissionId}/grade`,
    { method: 'PUT', body: JSON.stringify(payload), skipAuthRedirect: true },
  );
  return unwrap(res);
}

/** Giáo viên: bỏ chấm — bài nộp trở về trạng thái đã nộp */
export async function ungradeSubmission(
  courseId: string,
  assignmentId: string,
  submissionId: string,
): Promise<SubmissionDto> {
  const res = await apiFetch<ApiEnvelope<SubmissionDto>>(
    `${base(courseId, assignmentId)}/submissions/${submissionId}/grade`,
    { method: 'DELETE', skipAuthRedirect: true },
  );
  return unwrap(res);
}

/** Giáo viên: tải toàn bộ tệp bài nộp của bài tập dưới dạng .zip */
export async function downloadAllSubmissions(courseId: string, assignmentId: string, preferredName?: string): Promise<number> {
  const res = await apiFetchRaw(`${base(courseId, assignmentId)}/submissions/download`, { skipAuthRedirect: true });
  const total = Number(res.headers.get('X-Submission-Files') ?? 0);
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const fileName = preferredName ?? (encoded ? decodeURIComponent(encoded) : 'bai-nop.zip');

  const objectUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  return total;
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
