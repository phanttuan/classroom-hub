import type { SubmissionStatus } from './assignment';

export interface SubmissionStudentDto {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

/** Tệp đính kèm của bài nộp (1 tệp) — xem / tải qua /resources/:id/preview|download */
export interface SubmissionFileDto {
  id: string;
  fileName: string;
  fileSizeBytes: string;
  mimeType: string;
  createdAt: string;
}

export interface SubmissionDto {
  id: string;
  assignmentId: string;
  studentId: string;
  student: SubmissionStudentDto;
  status: SubmissionStatus;
  /** Bài làm văn bản (HTML đã được backend làm sạch) */
  content: string | null;
  isLate: boolean;
  submittedAt: string;
  updatedAt: string;
  /** Điểm đã chấm ("8.50") — null khi chưa chấm */
  score: string | null;
  /** Nhận xét của giáo viên (HTML đã làm sạch) */
  feedback: string | null;
  gradedAt: string | null;
  file: SubmissionFileDto | null;
}

export interface GradeSubmissionPayload {
  score: number;
  feedback?: string;
}

export type SubmissionBlockReason =
  | 'DRAFT'
  | 'CLOSED'
  | 'NOT_OPEN'
  | 'PAST_DUE'
  | 'COURSE_ARCHIVED'
  | 'GRADED';

/** Cửa sổ nộp bài tại thời điểm server trả về */
export interface SubmissionWindowDto {
  isPastDue: boolean;
  canSubmit: boolean;
  wouldBeLate: boolean;
  reason: SubmissionBlockReason | null;
}

/** Quy tắc tệp nộp — backend là nguồn sự thật, frontend dùng để kiểm tra sớm */
export interface SubmissionFileRulesDto {
  maxFileBytes: number;
  blockedExtensions: string[];
}

/** GET /courses/:courseId/assignments/:assignmentId/submission */
export interface MySubmissionResponse {
  submission: SubmissionDto | null;
  window: SubmissionWindowDto;
  rules: SubmissionFileRulesDto;
  serverTime: string;
}

export interface SubmissionSummaryDto {
  enrolled: number;
  submitted: number;
  notSubmitted: number;
  late: number;
  graded: number;
}

/** GET /courses/:courseId/assignments/:assignmentId/submissions (giáo viên) */
export interface TeacherSubmissionListResponse {
  summary: SubmissionSummaryDto;
  window: SubmissionWindowDto;
  rows: { student: SubmissionStudentDto; submission: SubmissionDto | null }[];
}
