import { apiFetch } from './http-client';
import type {
  CourseDto,
  CreateCoursePayload,
  UpdateCoursePayload,
  UpdateCourseStatusPayload,
  CourseListResponse,
  CourseMembersResponse,
  BackendCourseStatus,
} from '../types/course';

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

export async function fetchTeacherCourses(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CourseListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `/courses${qs ? `?${qs}` : ''}`;
  const res = await apiFetch<ApiEnvelope<CourseListResponse> | CourseListResponse>(url);
  return unwrap(res);
}

export async function fetchCourseDetail(courseId: string): Promise<CourseDto> {
  const res = await apiFetch<ApiEnvelope<CourseDto> | CourseDto>(`/courses/${courseId}`);
  return unwrap(res);
}

/** Lấy danh sách thành viên lớp học (giảng viên phụ trách + sinh viên đang tham gia) */
export async function fetchCourseMembers(courseId: string): Promise<CourseMembersResponse> {
  const res = await apiFetch<ApiEnvelope<CourseMembersResponse> | CourseMembersResponse>(
    `/courses/${courseId}/members`,
  );
  return unwrap(res);
}

export async function createCourse(payload: CreateCoursePayload): Promise<CourseDto> {
  const res = await apiFetch<ApiEnvelope<CourseDto> | CourseDto>('/courses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateCourse(
  courseId: string,
  payload: UpdateCoursePayload,
): Promise<CourseDto> {
  const res = await apiFetch<ApiEnvelope<CourseDto> | CourseDto>(`/courses/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateCourseStatus(
  courseId: string,
  status: BackendCourseStatus,
): Promise<CourseDto> {
  const payload: UpdateCourseStatusPayload = { status };
  const res = await apiFetch<ApiEnvelope<CourseDto> | CourseDto>(
    `/courses/${courseId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  return unwrap(res);
}

export interface JoinCourseResult {
  message: string;
  course: CourseDto;
}

export async function joinCourse(courseCode: string): Promise<JoinCourseResult> {
  const res = await apiFetch<ApiEnvelope<CourseDto>>('/courses/join', {
    method: 'POST',
    body: JSON.stringify({ courseCode }),
    skipAuthRedirect: true,
  });
  return {
    message: res.message || 'Tham gia môn học thành công',
    course: res.data,
  };
}

export async function fetchStudentCourses(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CourseListResponse> {
  return fetchTeacherCourses(params);
}

