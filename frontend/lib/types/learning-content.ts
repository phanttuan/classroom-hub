export type LessonStatusType = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

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
  content: string;
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
  createdAt: string;
  updatedAt: string;
  lessons: LessonDto[];
  lessonCount?: number;
}

export interface ClassroomSummaryDto {
  id: string;
  name: string;
  classCode: string;
  status: string;
}

export interface CourseDto {
  id: string;
  classId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  modules: ModuleDto[];
  moduleCount?: number;
  totalLessons?: number;
  completedLessons?: number;
  progressPercent?: number;
  classroom?: ClassroomSummaryDto;
}
