import { apiFetch } from './http-client';
import type {
  ResourceDto,
  ResourcePreviewResponse,
} from '../types/resource';

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
 * Lấy danh sách tài liệu của bài học (đã lọc theo quyền sinh viên / giáo viên)
 */
export async function fetchLessonResources(
  lessonId: string,
): Promise<ResourceDto[]> {
  const res = await apiFetch<ApiEnvelope<ResourceDto[]> | ResourceDto[]>(
    `/lessons/${lessonId}/resources`,
  );
  return unwrap(res);
}

/**
 * Lấy signed preview URL (thời hạn 10 phút) để xem tài liệu trực tiếp
 */
export async function fetchResourcePreview(
  resourceId: string,
): Promise<ResourcePreviewResponse> {
  const res = await apiFetch<
    ApiEnvelope<ResourcePreviewResponse> | ResourcePreviewResponse
  >(`/resources/${resourceId}/preview`);
  return unwrap(res);
}

/**
 * Lấy signed download URL (có flag fl_attachment) để tải tài liệu về máy
 */
export async function fetchResourceDownload(
  resourceId: string,
): Promise<ResourcePreviewResponse> {
  const res = await apiFetch<
    ApiEnvelope<ResourcePreviewResponse> | ResourcePreviewResponse
  >(`/resources/${resourceId}/download`);
  return unwrap(res);
}

/**
 * Tự động kích hoạt tải file xuống máy tính từ download URL
 */
export async function triggerResourceDownload(
  resourceId: string,
  preferredFileName?: string,
): Promise<void> {
  const data = await fetchResourceDownload(resourceId);
  if (!data?.url) {
    throw new Error('Không lấy được đường dẫn tải tài liệu');
  }

  const link = document.createElement('a');
  link.href = data.url;
  link.setAttribute('download', preferredFileName || data.fileName || 'download');
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

