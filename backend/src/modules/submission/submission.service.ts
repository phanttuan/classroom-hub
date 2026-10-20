import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import archiver from 'archiver';
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
  ActorType,
  CourseStatus,
  EnrollmentStatus,
  GradeCategory,
  GradingMethod,
  ResourceParent,
  SubmissionStatus,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { UpsertSubmissionDto } from './dto/upsert-submission.dto.js';
import type { GradeSubmissionDto } from './dto/grade-submission.dto.js';

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

  /** Điểm + nhận xét đã chấm (nếu có) của từng sinh viên cho bài tập — lấy từ Grade qua GradeItem */
  private async loadGrades(assignmentId: bigint, studentIds: bigint[]) {
    const grades = new Map<bigint, GradeSummary>();
    if (!studentIds.length) return grades;
    const gradeItem = await this.prisma.gradeItem.findUnique({
      where: { assignmentId },
      select: { id: true },
    });
    if (!gradeItem) return grades;
    const rows = await this.prisma.grade.findMany({
      where: { gradeItemId: gradeItem.id, studentId: { in: studentIds } },
      select: { studentId: true, score: true, feedback: true, gradedAt: true, updatedAt: true },
    });
    for (const g of rows) {
      grades.set(g.studentId, {
        score: g.score.toFixed(2),
        feedback: g.feedback,
        gradedAt: g.updatedAt,
      });
    }
    return grades;
  }

  private formatSubmission(s: SubmissionWithRelations, grade: GradeSummary | null = null) {
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
      score: grade?.score ?? null,
      feedback: grade?.feedback ?? null,
      gradedAt: grade?.gradedAt ?? null,
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
    const grades = submission ? await this.loadGrades(assignmentId, [studentId]) : new Map<bigint, GradeSummary>();

    return {
      submission: submission ? this.formatSubmission(submission, grades.get(studentId) ?? null) : null,
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

    // --- Bài làm văn bản: chặn ở backend khi giáo viên không cho phép ---
    const rawContent = dto.content ?? '';
    const hasTextInput = htmlToPlainText(rawContent).length > 0 || /<img\b/i.test(rawContent);
    if (hasTextInput && !assignment.allowTextSubmission) {
      throw new BadRequestException('Bài tập này không nhận bài làm văn bản');
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
          ? 'Bài nộp cần có bài làm văn bản hoặc tệp đính kèm'
          : assignment.allowFileSubmission
            ? 'Vui lòng đính kèm tệp bài làm'
            : 'Vui lòng nhập bài làm văn bản',
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
    const grades = await this.loadGrades(
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
        submission: s ? this.formatSubmission(s, grades.get(student.id) ?? null) : null,
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
    const grades = await this.loadGrades(assignmentId, [submission.studentId]);
    return this.formatSubmission(submission, grades.get(submission.studentId) ?? null);
  }

  /**
   * Chấm điểm / chấm lại một bài nộp (idempotent — upsert Grade theo gradeItem + sinh viên).
   * Trong một transaction: Grade (score, feedback, gradedBy, gradedAt) + GradeHistory + Submission.status = GRADED.
   */
  async grade(
    courseId: bigint,
    assignmentId: bigint,
    submissionId: bigint,
    teacherId: bigint,
    dto: GradeSubmissionDto,
  ) {
    const assignment = await this.loadAssignment(courseId, assignmentId);
    if (assignment.course.status === CourseStatus.ARCHIVED) {
      throw new ConflictException(BLOCK_MESSAGES.COURSE_ARCHIVED.replace('nộp bài', 'chấm điểm'));
    }
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, assignmentId: true, studentId: true },
    });
    if (!submission || submission.assignmentId !== assignmentId) {
      throw new NotFoundException('Bài nộp không tồn tại');
    }

    const maxScore = Number(assignment.maxScore);
    if (!Number.isFinite(dto.score) || dto.score < 0 || dto.score > maxScore) {
      throw new BadRequestException(`Điểm phải nằm trong khoảng 0 – ${maxScore}`);
    }
    const score = new Prisma.Decimal(dto.score.toFixed(2));
    // feedback không gửi → giữ nhận xét cũ; gửi chuỗi rỗng → xóa nhận xét
    const feedbackProvided = dto.feedback !== undefined;
    const sanitized = sanitizeRichHtml(dto.feedback);
    const feedbackIsEmpty = htmlToPlainText(sanitized).length === 0 && !/<img\b/i.test(sanitized);
    const nextFeedback = feedbackIsEmpty ? null : sanitized;

    await this.prisma.$transaction(async (tx) => {
      // GradeItem được tạo cùng bài tập; tạo bù nếu dữ liệu cũ thiếu
      const gradeItem =
        (await tx.gradeItem.findUnique({ where: { assignmentId }, select: { id: true } })) ??
        (await tx.gradeItem.create({
          data: { courseId, category: GradeCategory.ASSIGNMENT, assignmentId, maxScore: assignment.maxScore },
          select: { id: true },
        }));

      const existing = await tx.grade.findUnique({
        where: { uk_grades_grade_item_student: { gradeItemId: gradeItem.id, studentId: submission.studentId } },
        select: { id: true, score: true, feedback: true },
      });

      const cleanFeedback = feedbackProvided ? nextFeedback : (existing?.feedback ?? null);
      const saved = await tx.grade.upsert({
        where: { uk_grades_grade_item_student: { gradeItemId: gradeItem.id, studentId: submission.studentId } },
        create: {
          gradeItemId: gradeItem.id,
          studentId: submission.studentId,
          score,
          feedback: cleanFeedback,
          gradingMethod: GradingMethod.MANUAL,
          gradedBy: teacherId,
          gradedAt: new Date(),
        },
        update: {
          score,
          feedback: cleanFeedback,
          gradingMethod: GradingMethod.MANUAL,
          gradedBy: teacherId,
          gradedAt: new Date(),
        },
        select: { id: true },
      });

      // Lịch sử điểm: ghi mọi lần chấm / chấm lại để tra cứu
      await tx.gradeHistory.create({
        data: {
          gradeId: saved.id,
          oldScore: existing?.score ?? null,
          newScore: score,
          oldFeedback: existing?.feedback ?? null,
          newFeedback: cleanFeedback,
          actorType: ActorType.USER,
          actorId: teacherId,
          reason: existing ? 'Chấm lại bài nộp' : 'Chấm bài nộp',
        },
      });

      await tx.submission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.GRADED },
      });
    });

    return this.getOneForTeacher(courseId, assignmentId, submissionId);
  }

  /** Bỏ chấm: xóa điểm (kèm lịch sử) và cho phép sinh viên nộp lại khi còn hạn */
  async ungrade(courseId: bigint, assignmentId: bigint, submissionId: bigint) {
    await this.loadAssignment(courseId, assignmentId);
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, assignmentId: true, studentId: true, status: true },
    });
    if (!submission || submission.assignmentId !== assignmentId) {
      throw new NotFoundException('Bài nộp không tồn tại');
    }
    if (submission.status !== SubmissionStatus.GRADED) {
      throw new ConflictException('Bài nộp chưa được chấm điểm');
    }

    await this.prisma.$transaction(async (tx) => {
      const gradeItem = await tx.gradeItem.findUnique({ where: { assignmentId }, select: { id: true } });
      if (gradeItem) {
        await tx.grade.deleteMany({ where: { gradeItemId: gradeItem.id, studentId: submission.studentId } });
      }
      await tx.submission.update({ where: { id: submission.id }, data: { status: SubmissionStatus.SUBMITTED } });
    });

    return this.getOneForTeacher(courseId, assignmentId, submissionId);
  }

  /**
   * Gói toàn bộ tệp bài nộp của bài tập thành .zip (stream — không giữ cả gói trong RAM).
   * Mỗi sinh viên một thư mục `<Họ tên> (<email>)/<tên tệp>`; tệp không tải được từ Cloudinary
   * (ví dụ dữ liệu mẫu) được liệt kê trong README.txt thay vì làm hỏng cả gói.
   */
  async buildSubmissionsArchive(courseId: bigint, assignmentId: bigint) {
    const assignment = await this.loadAssignment(courseId, assignmentId);
    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId, resource: { isNot: null } },
      include: { resource: true, student: { select: studentSelect } },
      orderBy: { student: { fullName: 'asc' } },
    });

    const archive = archiver('zip', { zlib: { level: 6 } });
    const missing: string[] = [];
    const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').trim();

    const fill = async () => {
      for (const s of submissions) {
        const r = s.resource!;
        const folder = `${safe(s.student.fullName)} (${safe(s.student.email)})${s.isLate ? ' [NOP TRE]' : ''}`;
        const entry = `${folder}/${safe(r.fileName)}`;
        try {
          const signed = this.cloudinary.generateSignedUrl(r.storageKey, {
            isDownload: true,
            expiresInSeconds: 600,
            format: extname(r.fileName).slice(1),
          });
          const res = await fetch(signed.url);
          if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
          archive.append(Readable.fromWeb(res.body as never), { name: entry, date: s.submittedAt });
        } catch (error) {
          missing.push(`${entry} — ${(error as Error).message}`);
        }
      }
      const lines = [
        `Bài tập: ${assignment.title}`,
        `Số bài nộp có tệp: ${submissions.length}`,
        `Tải lúc: ${new Date().toISOString()}`,
        '',
        missing.length ? `Không tải được ${missing.length} tệp:` : 'Đã tải đủ toàn bộ tệp.',
        ...missing.map((m) => `  - ${m}`),
      ];
      archive.append(lines.join('\n'), { name: 'README.txt' });
      await archive.finalize();
    };

    // Không chờ: controller pipe archive ra response trong lúc các tệp được nạp dần
    void fill().catch((error) => archive.destroy(error as Error));

    const fileName = `${safe(assignment.title).replace(/\s+/g, '-').slice(0, 80) || 'bai-nop'}-bai-nop.zip`;
    return { archive, fileName, total: submissions.length };
  }
}

interface GradeSummary {
  score: string;
  feedback: string | null;
  gradedAt: Date;
}
