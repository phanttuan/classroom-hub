export type BackendAssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface AssignmentMySubmissionDto {
  status: 'SUBMITTED' | 'GRADED';
  score: string | null;
  submittedAt: string;
}

/**
 * Dữ liệu bài tập trả về từ Backend (/courses/:courseId/assignments).
 * Lưu ý: maxScore được backend serialize dưới dạng chuỗi thập phân ("10.00"),
 * các trường định danh (id, courseId, createdBy, gradeItemId) đều là string.
 */
export interface AssignmentDto {
  id: string;
  courseId: string;
  moduleId: string;
  createdBy: string;
  title: string;
  description?: string | null;
  /** Chuỗi số thập phân từ Prisma Decimal, ví dụ: "10.00" */
  maxScore: string;
  openAt: string;
  dueAt: string;
  status: BackendAssignmentStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  gradeItemId?: string;
  mySubmission?: AssignmentMySubmissionDto | null;
}

/**
 * Payload gửi lên khi tạo bài tập mới (POST /courses/:courseId/assignments).
 * Lưu ý: maxScore gửi lên phải là kiểu number (>= 0.01).
 */
export interface CreateAssignmentPayload {
  moduleId: string;
  title: string;
  description?: string;
  maxScore: number;
  openAt: string;
  dueAt: string;
}

/**
 * Payload gửi lên khi cập nhật bài tập ở trạng thái DRAFT (PATCH /courses/:courseId/assignments/:assignmentId).
 * Lưu ý: maxScore (nếu có) gửi lên phải là kiểu number (>= 0.01).
 */
export interface UpdateAssignmentPayload {
  moduleId?: string;
  title?: string;
  description?: string;
  maxScore?: number;
  openAt?: string;
  dueAt?: string;
}

