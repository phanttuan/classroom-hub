export type BackendAssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export type SubmissionStatus = 'SUBMITTED' | 'GRADED';

/** Tóm tắt bài nộp của chính sinh viên gắn kèm bài tập (chi tiết lấy ở submission-api) */
export interface AssignmentMySubmissionDto {
  id: string;
  status: SubmissionStatus;
  isLate: boolean;
  submittedAt: string;
}

/** Số bài đã nộp / nộp trễ — chỉ có trong danh sách của giáo viên */
export interface AssignmentSubmissionStatsDto {
  submitted: number;
  late: number;
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
  /** Tùy chọn nộp bài do giáo viên thiết lập */
  allowLateSubmission: boolean;
  allowTextSubmission: boolean;
  allowFileSubmission: boolean;
  /** Vị trí trong topic — cùng dãy số với Lesson.orderIndex (kéo thả xen kẽ) */
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  gradeItemId?: string;
  mySubmission?: AssignmentMySubmissionDto | null;
  submissionStats?: AssignmentSubmissionStatsDto;
}

/** Tùy chọn nộp bài — dùng chung cho payload tạo / cập nhật */
export interface AssignmentSubmissionOptions {
  allowLateSubmission?: boolean;
  allowTextSubmission?: boolean;
  allowFileSubmission?: boolean;
}

/**
 * Payload gửi lên khi tạo bài tập mới (POST /courses/:courseId/assignments).
 * Lưu ý: maxScore gửi lên phải là kiểu number (>= 0.01).
 */
export interface CreateAssignmentPayload extends AssignmentSubmissionOptions {
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
export interface UpdateAssignmentPayload extends AssignmentSubmissionOptions {
  moduleId?: string;
  title?: string;
  description?: string;
  maxScore?: number;
  openAt?: string;
  dueAt?: string;
}
