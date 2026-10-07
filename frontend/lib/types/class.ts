import type { TeacherClass } from './teacher';
import type { StudentClass, StudentClassStatus } from './student';

export type BackendClassStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface ClassroomDto {
  id: string;
  ownerId: string;
  classCode: string;
  name: string;
  description?: string | null;
  status: BackendClassStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    memberships: number;
    courses: number;
    assignments: number;
    quizzes: number;
  };
  owner?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface CreateClassPayload {
  name: string;
  description?: string;
}

export interface UpdateClassPayload {
  name?: string;
  description?: string;
}

export interface UpdateClassStatusPayload {
  status: BackendClassStatus;
}

export interface ClassListResponse {
  items: ClassroomDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function mapClassroomDtoToTeacherClass(dto: ClassroomDto): TeacherClass {
  const statusMap: Record<BackendClassStatus, 'active' | 'closed' | 'archived'> = {
    ACTIVE: 'active',
    CLOSED: 'closed',
    ARCHIVED: 'archived',
  };

  const gradients = [
    'from-blue-100 via-sky-100 to-slate-200',
    'from-emerald-100 via-teal-100 to-slate-200',
    'from-amber-100 via-orange-100 to-slate-200',
    'from-purple-100 via-indigo-100 to-slate-200',
    'from-rose-100 via-pink-100 to-slate-200',
  ];
  const emojis = ['📚', '💻', '📐', '🔬', '🎨', '🌐', '🧠'];
  const hash = Math.abs(dto.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const coverGradient = gradients[hash % gradients.length];
  const coverEmoji = emojis[hash % emojis.length];

  const dateObj = new Date(dto.updatedAt);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('vi-VN')
    : dto.updatedAt;

  return {
    id: dto.id,
    code: dto.classCode,
    name: dto.name,
    studentCount: dto._count?.memberships ?? 0,
    courseCount: dto._count?.courses ?? 0,
    assignmentCount: dto._count?.assignments ?? 0,
    quizCount: dto._count?.quizzes ?? 0,
    updatedAt: formattedDate,
    status: statusMap[dto.status] ?? 'active',
    coverGradient,
    coverEmoji,
    description: dto.description ?? '',
  };
}

export function mapClassroomDtoToStudentClass(dto: ClassroomDto): StudentClass {
  const gradients = [
    'from-blue-600 via-indigo-600 to-sky-600',
    'from-emerald-600 via-teal-600 to-cyan-600',
    'from-amber-600 via-orange-600 to-red-500',
    'from-purple-600 via-violet-600 to-indigo-600',
    'from-rose-600 via-pink-600 to-purple-600',
    'from-cyan-600 via-blue-600 to-indigo-600',
  ];
  const emojis = ['📚', '💻', '📐', '🔬', '🎨', '🌐', '🧠', '⚡'];
  const hash = Math.abs(dto.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const coverGradient = gradients[hash % gradients.length];
  const coverEmoji = emojis[hash % emojis.length];

  const status: StudentClassStatus =
    dto.status === 'CLOSED' || dto.status === 'ARCHIVED' ? 'finished' : 'studying';

  return {
    id: dto.id,
    code: dto.classCode,
    name: dto.name,
    teacher: dto.owner?.fullName || 'Giảng viên',
    status,
    memberCount: dto._count?.memberships ?? 0,
    coverGradient,
    coverEmoji,
    coverImageUrl: null,
    progress: 0,
    lessonsDone: 0,
    lessonsTotal: dto._count?.courses ?? 0,
    currentScore: null,
    assignmentNote: dto._count?.assignments ? `${dto._count.assignments} bài tập` : undefined,
    quizNote: dto._count?.quizzes ? `${dto._count.quizzes} bài kiểm tra` : undefined,
  };
}

