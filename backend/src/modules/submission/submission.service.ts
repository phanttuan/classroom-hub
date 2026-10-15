import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { PrismaService } from '../../database/prisma.service.js';
import { CloudinaryService } from '../resource/cloudinary.service.js';
import {
  BLOCKED_EXTENSIONS,
  ResourceUploadService,
  decodeOriginalName,
} from '../resource/resource-upload.service.js';
import {
  htmlToPlainText,
  sanitizeRichHtml,
} from '../learning-content/utils/html-sanitizer.js';
import {
  ActivityStatus,
  CourseStatus,
  EnrollmentStatus,
  ResourceParent,
  SubmissionStatus,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { UpsertSubmissionDto } from './dto/upsert-submission.dto.js';

/** Lý do sinh viên chưa thể nộp / sửa bài vào lúc này */
export type SubmissionBlockReason =
  | 'DRAFT'
  | 'CLOSED'
  | 'NOT_OPEN'
  | 'PAST_DUE'
  | 'COURSE_ARCHIVED'
  | 'GRADED';

export interface SubmissionWindow {
  /** Đã qua hạn nộp (dueAt) */
  isPastDue: boolean;
  /** Sinh viên có thể nộp / sửa / loại bỏ bài vào lúc này */
  canSubmit: boolean;
  /** Nộp lúc này sẽ bị đánh dấu "Nộp trễ" */
  wouldBeLate: boolean;
  reason: SubmissionBlockReason | null;
}

const BLOCK_MESSAGES: Record<SubmissionBlockReason, string> = {
  DRAFT: 'Bài tập chưa được xuất bản',
  CLOSED: 'Giáo viên đã đóng bài tập, không nhận bài nộp nữa',
  NOT_OPEN: 'Bài tập chưa đến thời gian mở nộp bài',
  PAST_DUE: 'Đã quá hạn nộp bài và bài tập này không cho phép nộp trễ',
  COURSE_ARCHIVED: 'Khóa học đã lưu trữ (chỉ đọc), không thể nộp bài',
  GRADED: 'Bài nộp đã được chấm điểm, không thể thay đổi',
};

type AssignmentForSubmission = Prisma.AssignmentGetPayload<{
  include: { course: { select: { status: true } } };
}>;

type SubmissionWithRelations = Prisma.SubmissionGetPayload<{
  include: {
    resource: true;
    student: { select: { id: true; fullName: true; email: true; avatarUrl: true } };
  };
}>;

const studentSelect = { id: true, fullName: true, email: true, avatarUrl: true } as const;

/**
 * Sinh viên xem / nộp / sửa / loại bỏ bài nộp; giáo viên xem danh sách bài nộp.
 * Quy ước lưu tệp (đồng bộ ResourceUploadService):
 *  - 1 bài nộp tối đa 1 tệp (nhiều tệp → nén .zip), tệp mới thay thế tệp cũ
 *  - public_id: `classroom-hub/submissions/<courseId>/<assignmentId>/<studentId>/<thời gian>-<ngẫu nhiên>-<tên>`
 *  - delivery `authenticated`: chỉ tải qua signed URL có hạn (ResourceService kiểm tra quyền)
 */
@Injectable()
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly uploads: ResourceUploadService,
  ) {}

  /** Quy tắc tệp nộp — trả về cho frontend hiển thị và kiểm tra sớm trước khi tải lên */
  getFileRules() {
    return {
      maxFileBytes: this.uploads.maxFileBytes,
      blockedExtensions: [...BLOCKED_EXTENSIONS],
    };
  }

  /** Cửa sổ nộp bài của một bài tập tại thời điểm `now` (chưa xét bài nộp đã chấm) */
  static computeWindow(
    assignment: Pick<AssignmentForSubmission, 'status' | 'openAt' | 'dueAt' | 'allowLateSubmission'> & {
      course?: { status: CourseStatus } | null;
    },
    now = new Date(),
  ): SubmissionWindow {
    const isPastDue = now > assignment.dueAt;
    let reason: SubmissionBlockReason | null = null;
    if (assignment.status === ActivityStatus.DRAFT) reason = 'DRAFT';
    else if (assignment.course?.status === CourseStatus.ARCHIVED) reason = 'COURSE_ARCHIVED';
    else if (assignment.status === ActivityStatus.CLOSED) reason = 'CLOSED';
    else if (now < assignment.openAt) reason = 'NOT_OPEN';
    else if (isPastDue && !assignment.allowLateSubmission) reason = 'PAST_DUE';

    return {
      isPastDue,
      canSubmit: reason === null,
      wouldBeLate: reason === null && isPastDue,
      reason,
    };
  }

  private async loadAssignment(courseId: bigint, assignmentId: bigint) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: { select: { status: true } } },
    });
    if (!assignment || assignment.courseId !== courseId) {
      throw new NotFoundException('Bài tập không tồn tại trong khóa học này');
    }
    return assignment;
  }

  private async findMySubmission(assignmentId: bigint, studentId: bigint) {
    return this.prisma.submission.findUnique({
      where: { uk_submissions_assignment_student: { assignmentId, studentId } },
      include: { resource: true, student: { select: studentSelect } },
    });
  }

  /** Điểm đã chấm (nếu có) của từng sinh viên cho bài tập — lấy từ Grade qua GradeItem */
  private async loadScores(assignmentId: bigint, studentIds: bigint[]) {
    const scores = new Map<bigint, string>();
    if (!studentIds.length) return scores;
    const gradeItem = await this.prisma.gradeItem.findUnique({
      where: { assignmentId },
      select: { id: true },
    });
    if (!gradeItem) return scores;
    const grades = await this.prisma.grade.findMany({
      where: { gradeItemId: gradeItem.id, studentId: { in: studentIds } },
      select: { studentId: true, score: true },
    });
    for (const g of grades) scores.set(g.studentId, g.score.toFixed(2));
    return scores;
  }

  private formatSubmission(s: SubmissionWithRelations, score: string | null = null) {
    return {
      id: s.id.toString(),
      assignmentId: s.assignmentId.toString(),
      studentId: s.studentId.toString(),
      student: {
        id: s.student.id.toString(),
        fullName: s.student.fullName,
        email: s.student.email,
        avatarUrl: s.student.avatarUrl,
      },
      status: s.status,
      content: s.content,
      isLate: s.isLate,
      submittedAt: s.submittedAt,
      updatedAt: s.updatedAt,
      score,
      file: s.resource
        ? {
            id: s.resource.id.toString(),
            fileName: s.resource.fileName,
            fileSizeBytes: s.resource.fileSizeBytes.toString(),
            mimeType: s.resource.mimeType,
            createdAt: s.resource.createdAt,
          }
        : null,
    };
  }

  // ===========================================================================
  // SINH VIÊN
  // ===========================================================================

  /** Bài nộp của chính sinh viên + cửa sổ nộp + quy tắc tệp (trang chi tiết bài tập) */
  async getMySubmission(courseId: bigint, assignmentId: bigint, studentId: bigint) {
    const assignment = await this.loadAssignment(courseId, assignmentId);
    if (assignment.status === ActivityStatus.DRAFT) {
      throw new ForbiddenException('Sinh viên không có quyền xem bài tập đang ở trạng thái nháp');
    }
    const submission = await this.findMySubmission(assignmentId, studentId);
    const window = SubmissionService.computeWindow(assignment);
    if (submission?.status === SubmissionStatus.GRADED) {
      window.canSubmit = false;
      window.wouldBeLate = false;
      window.reason = 'GRADED';
    }
    const scores = submission ? await this.loadScores(assignmentId, [studentId]) : new Map<bigint, string>();

    return {
      submission: submission ? this.formatSubmission(submission, scores.get(studentId) ?? null) : null,
      window,
      rules: this.getFileRules(),
      serverTime: new Date(),
    };
  }

  /**
   * Nộp bài lần đầu hoặc chỉnh sửa bài nộp (upsert — không tạo bản ghi trùng).
   * Mỗi lần lưu, thời gian nộp được cập nhật thành thời điểm hiện tại và tính lại cờ nộp trễ.
   */
  async upsert(
    courseId: bigint,
    assignmentId: bigint,
    studentId: bigint,
    dto: UpsertSubmissionDto,
    file?: Express.Multer.File,
  ) {
    try {
      return await this.storeSubmission(courseId, assignmentId, studentId, dto, file);
    } finally {
      if (file?.path) await rm(file.path, { force: true }).catch(() => undefined);
    }
  }

  private async storeSubmission(
    courseId: bigint,
    assignmentId: bigint,
    studentId: bigint,
    dto: UpsertSubmissionDto,
    file?: Express.Multer.File,
  ) {
    const assignment = await this.loadAssignment(courseId, assignmentId);
    const now = new Date();
    const window = SubmissionService.computeWindow(assignment, now);
    if (!window.canSubmit) {
      if (window.reason === 'DRAFT') throw new ForbiddenException(BLOCK_MESSAGES.DRAFT);
      throw new ConflictException(BLOCK_MESSAGES[window.reason!]);
    }

    const existing = await this.findMySubmission(assignmentId, studentId);
    if (existing?.status === SubmissionStatus.GRADED) {
      throw new ConflictException(BLOCK_MESSAGES.GRADED);
    }

    // --- Bài làm trực tuyến: chặn ở backend khi giáo viên không cho phép ---
    const rawContent = dto.content ?? '';
    const hasTextInput = htmlToPlainText(rawContent).length > 0 || /<img\b/i.test(rawContent);
    if (hasTextInput && !assignment.allowTextSubmission) {
      throw new BadRequestException('Bài tập này không nhận bài làm trực tuyến');
    }
    const content = assignment.allowTextSubmission && hasTextInput ? sanitizeRichHtml(rawContent) : null;

    // --- Tệp đính kèm: chặn ở backend khi giáo viên không cho phép ---
    if (file && !assignment.allowFileSubmission) {
      throw new BadRequestException('Bài tập này không nhận tệp đính kèm');
    }
    const previousResource = existing?.resource ?? null;
    const keepsPreviousFile = Boolean(previousResource) && !file && !dto.removeFile;
    if (!content && !file && !keepsPreviousFile) {
      throw new BadRequestException(
        assignment.allowTextSubmission && assignment.allowFileSubmission
          ? 'Bài nộp cần có bài làm trực tuyến hoặc tệp đính kèm'
          : assignment.allowFileSubmission
            ? 'Vui lòng đính kèm tệp bài làm'
            : 'Vui lòng nhập bài làm trực tuyến',
      );
    }

    // --- Tải tệp mới lên Cloudinary (trước khi ghi DB để lỗi upload không để lại bản ghi hỏng) ---
    let uploaded: { storageKey: string; fileName: string; size: number; mimeType: string } | null = null;
    if (file) {
      const fileName = decodeOriginalName(file.originalname);
      this.uploads.validateFile(file, fileName);
      await this.uploads.assertSafeContent(file, fileName);
      const resourceType = CloudinaryService.resolveResourceType(file.mimetype);
      const result = await this.cloudinary.uploadFile(file.path, {
        publicId: this.uploads.buildPublicId(
          `classroom-hub/submissions/${courseId}/${assignmentId}/${studentId}`,
          fileName,
          resourceType === 'raw',
        ),
        resourceType,
        deliveryType: 'authenticated',
      });
      uploaded = {
        storageKey: result.storageKey,
        fileName,
        size: file.size,
        mimeType: file.mimetype || 'application/octet-stream',
      };
    }

    const dropPreviousFile = Boolean(previousResource) && (Boolean(file) || Boolean(dto.removeFile));

    let saved: SubmissionWithRelations;
    try {
      saved = await this.prisma.$transaction(async (tx) => {
        const submission = await tx.submission.upsert({
          where: { uk_submissions_assignment_student: { assignmentId, studentId } },
          create: {
            assignmentId,
            studentId,
            content,
            isLate: window.wouldBeLate,
            submittedAt: now,
            status: SubmissionStatus.SUBMITTED,
          },
          update: {
            content,
            isLate: window.wouldBeLate,
            submittedAt: now,
            status: SubmissionStatus.SUBMITTED,
          },
          select: { id: true },
        });

        if (dropPreviousFile) {
          await tx.resource.delete({ where: { id: previousResource!.id } });
        }
        if (uploaded) {
          await tx.resource.create({
            data: {
              parentType: ResourceParent.SUBMISSION,
              submissionId: submission.id,
              uploadedBy: studentId,
              fileName: uploaded.fileName,
              storageKey: uploaded.storageKey,
              fileSizeBytes: BigInt(uploaded.size),
              mimeType: uploaded.mimeType,
            },
          });
        }

        return tx.submission.findUniqueOrThrow({
          where: { id: submission.id },
          include: { resource: true, student: { select: studentSelect } },
        });
      });
    } catch (error) {
      // Ghi DB lỗi → tệp vừa tải lên thành mồ côi, dọn ngay
      if (uploaded) await this.cloudinary.destroy(uploaded.storageKey);
      throw error;
    }

    if (dropPreviousFile) await this.cloudinary.destroy(previousResource!.storageKey);
    return this.formatSubmission(saved);
  }

  /** Loại bỏ bài nộp — trở về trạng thái chưa nộp (xóa cả tệp trên Cloudinary) */
  async remove(courseId: bigint, assignmentId: bigint, studentId: bigint) {
    const assignment = await this.loadAssignment(courseId, assignmentId);
    const existing = await this.findMySubmission(assignmentId, studentId);
    if (!existing) throw new NotFoundException('Bạn chưa nộp bài cho bài tập này');
    if (existing.status === SubmissionStatus.GRADED) {
      throw new ConflictException(BLOCK_MESSAGES.GRADED);
    }
    const window = SubmissionService.computeWindow(assignment);
    if (!window.canSubmit) {
      if (window.reason === 'DRAFT') throw new ForbiddenException(BLOCK_MESSAGES.DRAFT);
      throw new ConflictException(BLOCK_MESSAGES[window.reason!]);
    }

    // Xóa submission → cascade xóa bản ghi resource
    await this.prisma.submission.delete({ where: { id: existing.id } });
    if (existing.resource) await this.cloudinary.destroy(existing.resource.storageKey);
    return { message: 'Đã loại bỏ bài nộp' };
  }

  // ===========================================================================
  // GIÁO VIÊN
  // ===========================================================================

  /** Danh sách bài nộp theo từng sinh viên đang tham gia khóa học (giống bảng chấm bài của Moodle) */
  async listForTeacher(courseId: bigint, assignmentId: bigint) {
    const assignment = await this.loadAssignment(courseId, assignmentId);

    const [enrollments, submissions] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId, status: EnrollmentStatus.ACTIVE },
        select: { student: { select: studentSelect } },
        orderBy: { student: { fullName: 'asc' } },
      }),
      this.prisma.submission.findMany({
        where: { assignmentId },
        include: { resource: true, student: { select: studentSelect } },
      }),
    ]);
    const scores = await this.loadScores(
      assignmentId,
      submissions.map((s) => s.studentId),
    );

    const byStudent = new Map(submissions.map((s) => [s.studentId, s]));
    const rows = enrollments.map(({ student }) => {
      const s = byStudent.get(student.id);
      return {
        student: {
          id: student.id.toString(),
          fullName: student.fullName,
          email: student.email,
          avatarUrl: student.avatarUrl,
        },
        submission: s ? this.formatSubmission(s, scores.get(student.id) ?? null) : null,
      };
    });

    const submitted = rows.filter((r) => r.submission);
    return {
      summary: {
        enrolled: rows.length,
        submitted: submitted.length,
        notSubmitted: rows.length - submitted.length,
        late: submitted.filter((r) => r.submission!.isLate).length,
        graded: submitted.filter((r) => r.submission!.status === SubmissionStatus.GRADED).length,
      },
      window: SubmissionService.computeWindow(assignment),
      rows,
    };
  }

  /** Chi tiết một bài nộp (giáo viên phụ trách / admin) */
  async getOneForTeacher(courseId: bigint, assignmentId: bigint, submissionId: bigint) {
    await this.loadAssignment(courseId, assignmentId);
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { resource: true, student: { select: studentSelect } },
    });
    if (!submission || submission.assignmentId !== assignmentId) {
      throw new NotFoundException('Bài nộp không tồn tại');
    }
    const scores = await this.loadScores(assignmentId, [submission.studentId]);
    return this.formatSubmission(submission, scores.get(submission.studentId) ?? null);
  }
}
