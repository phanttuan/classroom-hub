import { apiFetch } from './http-client';
import type {
  CourseContentDto,
  LessonDto,
  LessonPayload,
  LessonTypeKey,
  ModuleDto,
  ResourceDto,
} from '../types/learning-content';

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
// COURSE CONTENT API
// (Tạo / sửa / đổi trạng thái môn học dùng course-api.ts)
// =========================================================================

export async function fetchCourseContent(courseId: string): Promise<CourseContentDto> {
  const res = await apiFetch<ApiEnvelope<CourseContentDto> | CourseContentDto>(`/courses/${courseId}/content`);
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
  payload: LessonPayload & { type: LessonTypeKey }
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

export async function updateLesson(lessonId: string, payload: LessonPayload): Promise<LessonDto> {
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

// =========================================================================
// UPLOAD TÀI LIỆU (FILE / FOLDER) & ẢNH TRONG NỘI DUNG
// =========================================================================

/** Tải tệp lên bài học FILE (thay thế tệp cũ) hoặc FOLDER (thêm vào thư mục) */
export async function uploadLessonFiles(lessonId: string, files: File[]): Promise<ResourceDto[]> {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  const res = await apiFetch<ApiEnvelope<ResourceDto[]>>(`/lessons/${lessonId}/resources`, {
    method: 'POST',
    body: form,
  });
  return unwrap(res);
}

export async function deleteResource(resourceId: string): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>(`/resources/${resourceId}`, {
    method: 'DELETE',
  });
  return unwrap(res);
}

/** Ảnh chèn trong trình soạn thảo — trả về URL công khai */
export async function uploadContentImage(courseId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch<ApiEnvelope<{ url: string }>>(`/courses/${courseId}/content-images`, {
    method: 'POST',
    body: form,
  });
  return unwrap(res).url;
}
