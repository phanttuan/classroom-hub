import { apiFetch } from './http-client';
import type {
  AssignmentDto,
  BackendAssignmentStatus,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
} from '../types/assignment';

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

/**
 * Chuẩn hóa thông báo lỗi tiếng Việt từ phản hồi lỗi của API bài tập (400, 403, 404, 409).
 */
export function formatAssignmentApiError(
  err: unknown,
  fallback = 'Không thể thực hiện thao tác với bài tập. Vui lòng thử lại.',
): string {
  const rawMessage = err instanceof Error ? err.message.trim() : '';
  if (!rawMessage) return fallback;

  if (rawMessage.includes('HTTP Error 403') || rawMessage.includes('403')) {
    return 'Bạn không có quyền thực hiện thao tác này trên khóa học.';
  }
  if (rawMessage.includes('HTTP Error 404') || rawMessage.includes('404')) {
    return 'Không tìm thấy bài tập hoặc khóa học tương ứng.';
  }
  if (rawMessage.includes('HTTP Error 409')) {
    return 'Trạng thái bài tập hiện tại không cho phép thực hiện thao tác này.';
  }
  if (rawMessage.includes('HTTP Error 400')) {
    return 'Dữ liệu bài tập không hợp lệ (hạn nộp phải sau thời gian mở và điểm tối đa phải lớn hơn 0).';
  }

  return rawMessage;
}

export async function fetchCourseAssignments(
  courseId: string,
  status?: BackendAssignmentStatus,
  moduleId?: string,
): Promise<AssignmentDto[]> {
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (moduleId) query.set('moduleId', moduleId);
  const qs = query.toString();
  const url = `/courses/${courseId}/assignments${qs ? `?${qs}` : ''}`;
  const res = await apiFetch<ApiEnvelope<AssignmentDto[]> | AssignmentDto[]>(
    url,
    { skipAuthRedirect: true },
  );
  return unwrap(res);
}

export async function fetchAssignmentDetail(
  courseId: string,
  assignmentId: string,
): Promise<AssignmentDto> {
  const res = await apiFetch<ApiEnvelope<AssignmentDto> | AssignmentDto>(
    `/courses/${courseId}/assignments/${assignmentId}`,
    { skipAuthRedirect: true },
  );
  return unwrap(res);
}

export async function createAssignment(
  courseId: string,
  payload: CreateAssignmentPayload,
): Promise<AssignmentDto> {
  const res = await apiFetch<ApiEnvelope<AssignmentDto> | AssignmentDto>(
    `/courses/${courseId}/assignments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function updateAssignment(
  courseId: string,
  assignmentId: string,
  payload: UpdateAssignmentPayload,
): Promise<AssignmentDto> {
  const res = await apiFetch<ApiEnvelope<AssignmentDto> | AssignmentDto>(
    `/courses/${courseId}/assignments/${assignmentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function publishAssignment(
  courseId: string,
  assignmentId: string,
): Promise<AssignmentDto> {
  const res = await apiFetch<ApiEnvelope<AssignmentDto> | AssignmentDto>(
    `/courses/${courseId}/assignments/${assignmentId}/publish`,
    {
      method: 'POST',
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

export async function closeAssignment(
  courseId: string,
  assignmentId: string,
): Promise<AssignmentDto> {
  const res = await apiFetch<ApiEnvelope<AssignmentDto> | AssignmentDto>(
    `/courses/${courseId}/assignments/${assignmentId}/close`,
    {
      method: 'POST',
      skipAuthRedirect: true,
    },
  );
  return unwrap(res);
}

