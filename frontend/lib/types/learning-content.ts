export type LessonStatusType = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** Loại hoạt động / tài nguyên (theo Moodle): Trang, Tệp, Thư mục, URL, Văn bản & phương tiện */
export type LessonTypeKey = 'PAGE' | 'FILE' | 'FOLDER' | 'URL' | 'LABEL';

/** Cách hiển thị FILE / URL */
export type LessonDisplayMode = 'AUTO' | 'EMBED' | 'DOWNLOAD' | 'OPEN' | 'NEW_WINDOW';

export interface LessonSettings {
  display?: LessonDisplayMode;
  showDescription?: boolean;
  showSize?: boolean;
  showType?: boolean;
  folderDisplay?: 'PAGE' | 'INLINE';
}

export interface LessonPayload {
  title?: string;
  description?: string;
  content?: string;
  externalUrl?: string;
  settings?: LessonSettings;
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface ResourceDto {
  id: string;
  parentType: 'LESSON' | 'SUBMISSION';
  fileName: string;
  storageKey: string;
  fileSizeBytes: string;
  mimeType: string;
  createdAt: string;
}

export interface LessonDto {
  id: string;
  moduleId: string;
  title: string;
  type: LessonTypeKey;
  description?: string | null;
  /** HTML đã được backend làm sạch */
  content: string;
  externalUrl?: string | null;
  settings?: LessonSettings | null;
  orderIndex: number;
  status: LessonStatusType;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isCompleted?: boolean;
  completedAt?: string | null;
  resources?: ResourceDto[];
}

export interface ModuleDto {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  /** Module "Chung" mặc định: luôn đứng đầu, không xóa / đổi tên / kéo thả */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  lessons: LessonDto[];
  lessonCount?: number;
}

export interface CourseOwnerSummaryDto {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

/**
 * Môn học (Course) kèm cây nội dung Module → Lesson và tiến độ học tập.
 * Trả về từ GET /courses/:courseId/content
 */
export interface CourseContentDto {
  id: string;
  ownerId: string;
  courseCode: string;
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  owner?: CourseOwnerSummaryDto;
  modules: ModuleDto[];
  moduleCount?: number;
  totalLessons?: number;
  completedLessons?: number;
  progressPercent?: number;
}

/** Tiến độ tổng hợp một lớp sinh viên đang học — GET /me/course-progress */
export interface CourseProgressSummaryDto {
  id: string;
  courseCode: string;
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  updatedAt: string;
  owner?: { id: string; fullName: string; avatarUrl?: string | null };
  moduleCount: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}
