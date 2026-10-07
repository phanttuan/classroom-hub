import type { TeacherClass } from './teacher';

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
