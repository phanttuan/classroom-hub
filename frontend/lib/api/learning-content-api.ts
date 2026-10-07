import { apiFetch } from './http-client';
import type { CourseDto, LessonDto, ModuleDto } from '../types/learning-content';

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

// =========================================================================
// COURSE APIS
// =========================================================================

export async function fetchCoursesByClass(classId: string): Promise<CourseDto[]> {
  const res = await apiFetch<ApiEnvelope<CourseDto[]> | CourseDto[]>(`/classes/${classId}/courses`);
  return unwrap(res);
}

export async function fetchCourseDetail(courseId: string): Promise<CourseDto> {
  const res = await apiFetch<ApiEnvelope<CourseDto> | CourseDto>(`/courses/${courseId}`);
  return unwrap(res);
}

export async function createCourse(classId: string, title: string): Promise<CourseDto> {
  const res = await apiFetch<ApiEnvelope<CourseDto> | CourseDto>(`/classes/${classId}/courses`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return unwrap(res);
}

export async function updateCourse(courseId: string, title: string): Promise<CourseDto> {
  const res = await apiFetch<ApiEnvelope<CourseDto> | CourseDto>(`/courses/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
  return unwrap(res);
}

export async function deleteCourse(courseId: string): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>(`/courses/${courseId}`, {
    method: 'DELETE',
  });
  return unwrap(res);
}

export async function reorderCourses(classId: string, itemIds: string[]): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>(`/classes/${classId}/courses/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ itemIds }),
  });
  return unwrap(res);
}

// =========================================================================
// MODULE APIS
// =========================================================================

export async function createModule(courseId: string, title: string): Promise<ModuleDto> {
  const res = await apiFetch<ApiEnvelope<ModuleDto> | ModuleDto>(`/courses/${courseId}/modules`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return unwrap(res);
}

export async function updateModule(moduleId: string, title: string): Promise<ModuleDto> {
  const res = await apiFetch<ApiEnvelope<ModuleDto> | ModuleDto>(`/modules/${moduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
  return unwrap(res);
}

export async function deleteModule(moduleId: string): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>(`/modules/${moduleId}`, {
    method: 'DELETE',
  });
  return unwrap(res);
}

export async function reorderModules(courseId: string, itemIds: string[]): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>(`/courses/${courseId}/modules/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ itemIds }),
  });
  return unwrap(res);
}

// =========================================================================
// LESSON APIS
// =========================================================================

export async function createLesson(
  moduleId: string,
  payload: { title: string; content?: string; status?: string }
): Promise<LessonDto> {
  const res = await apiFetch<ApiEnvelope<LessonDto> | LessonDto>(`/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function fetchLessonDetail(lessonId: string): Promise<LessonDto> {
  const res = await apiFetch<ApiEnvelope<LessonDto> | LessonDto>(`/lessons/${lessonId}`);
  return unwrap(res);
}

export async function updateLesson(
  lessonId: string,
  payload: { title?: string; content?: string; status?: string }
): Promise<LessonDto> {
  const res = await apiFetch<ApiEnvelope<LessonDto> | LessonDto>(`/lessons/${lessonId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteLesson(lessonId: string): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>(`/lessons/${lessonId}`, {
    method: 'DELETE',
  });
  return unwrap(res);
}

export async function reorderLessons(moduleId: string, itemIds: string[]): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>(`/modules/${moduleId}/lessons/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ itemIds }),
  });
  return unwrap(res);
}

// =========================================================================
// PROGRESS APIS (STUDENT)
// =========================================================================

export async function toggleLessonProgress(
  lessonId: string,
  isCompleted?: boolean
): Promise<{ lessonId: string; isCompleted: boolean; completedAt: string | null }> {
  const res = await apiFetch<ApiEnvelope<{ lessonId: string; isCompleted: boolean; completedAt: string | null }>>(
    `/lessons/${lessonId}/progress`,
    {
      method: 'POST',
      body: JSON.stringify({ isCompleted }),
    }
  );
  return unwrap(res);
}
