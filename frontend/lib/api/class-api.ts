import { apiFetch } from './http-client';
import type {
  ClassroomDto,
  CreateClassPayload,
  UpdateClassPayload,
  UpdateClassStatusPayload,
  ClassListResponse,
  BackendClassStatus,
} from '../types/class';

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

export async function fetchTeacherClasses(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ClassListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `/classes${qs ? `?${qs}` : ''}`;
  const res = await apiFetch<ApiEnvelope<ClassListResponse> | ClassListResponse>(url);
  return unwrap(res);
}

export async function fetchClassDetail(classId: string): Promise<ClassroomDto> {
  const res = await apiFetch<ApiEnvelope<ClassroomDto> | ClassroomDto>(`/classes/${classId}`);
  return unwrap(res);
}

export async function createClass(payload: CreateClassPayload): Promise<ClassroomDto> {
  const res = await apiFetch<ApiEnvelope<ClassroomDto> | ClassroomDto>('/classes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateClass(
  classId: string,
  payload: UpdateClassPayload,
): Promise<ClassroomDto> {
  const res = await apiFetch<ApiEnvelope<ClassroomDto> | ClassroomDto>(`/classes/${classId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateClassStatus(
  classId: string,
  status: BackendClassStatus,
): Promise<ClassroomDto> {
  const payload: UpdateClassStatusPayload = { status };
  const res = await apiFetch<ApiEnvelope<ClassroomDto> | ClassroomDto>(
    `/classes/${classId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  return unwrap(res);
}
