import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SubmissionService } from './submission.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { CloudinaryService } from '../resource/cloudinary.service.js';
import type { ResourceUploadService } from '../resource/resource-upload.service.js';
import {
  ActivityStatus,
  CourseStatus,
  SubmissionStatus,
} from '../../generated/prisma/enums.js';

const courseId = 1n;
const assignmentId = 100n;
const studentId = 20n;
const now = new Date('2026-10-15T10:00:00.000Z');

const student = { id: studentId, fullName: 'Trần Thị Mai', email: 's1@x.vn', avatarUrl: null };

const openAssignment = {
  id: assignmentId,
  courseId,
  status: ActivityStatus.PUBLISHED,
  openAt: new Date('2026-10-10T00:00:00.000Z'),
  dueAt: new Date('2026-10-20T23:59:00.000Z'),
  allowLateSubmission: false,
  allowTextSubmission: true,
  allowFileSubmission: true,
  course: { status: CourseStatus.ACTIVE },
};

const pastDueAssignment = { ...openAssignment, dueAt: new Date('2026-10-14T00:00:00.000Z') };

function submissionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 900n,
    assignmentId,
    studentId,
    status: SubmissionStatus.SUBMITTED,
    content: '<p>Bài làm</p>',
    isLate: false,
    submittedAt: now,
    updatedAt: now,
    resource: null,
    student,
    ...overrides,
  };
}

const tmpFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    originalname: 'bai-lam.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    path: '',
    ...overrides,
  }) as Express.Multer.File;

describe('SubmissionService', () => {
  let service: SubmissionService;
  let prisma: {
    assignment: { findUnique: ReturnType<typeof vi.fn> };
    submission: {
      findUnique: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    resource: { create: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
    enrollment: { findMany: ReturnType<typeof vi.fn> };
    gradeItem: { findUnique: ReturnType<typeof vi.fn> };
    grade: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let cloudinary: { uploadFile: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
  let uploads: {
    maxFileBytes: number;
    validateFile: ReturnType<typeof vi.fn>;
    assertSafeContent: ReturnType<typeof vi.fn>;
    buildPublicId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    prisma = {
      assignment: { findUnique: vi.fn().mockResolvedValue(openAssignment) },
      submission: {
        findUnique: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow: vi.fn().mockResolvedValue(submissionRow()),
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({ id: 900n }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      resource: { create: vi.fn(), delete: vi.fn() },
      enrollment: { findMany: vi.fn().mockResolvedValue([]) },
      gradeItem: { findUnique: vi.fn().mockResolvedValue(null) },
      grade: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };
    cloudinary = {
      uploadFile: vi.fn().mockResolvedValue({ storageKey: 'raw:classroom-hub/submissions/1/100/20/x.pdf' }),
      destroy: vi.fn().mockResolvedValue(undefined),
    };
    uploads = {
      maxFileBytes: 20 * 1024 * 1024,
      validateFile: vi.fn(),
      assertSafeContent: vi.fn().mockResolvedValue(undefined),
      buildPublicId: vi.fn().mockReturnValue('classroom-hub/submissions/1/100/20/x.pdf'),
    };

    service = new SubmissionService(
      prisma as unknown as PrismaService,
      cloudinary as unknown as CloudinaryService,
      uploads as unknown as ResourceUploadService,
    );
  });

  describe('computeWindow', () => {
    it('mở nộp bài trong khoảng openAt..dueAt', () => {
      const w = SubmissionService.computeWindow(openAssignment, now);
      expect(w).toEqual({ isPastDue: false, canSubmit: true, wouldBeLate: false, reason: null });
    });

    it('quá hạn và không cho nộp trễ → PAST_DUE', () => {
      const w = SubmissionService.computeWindow(pastDueAssignment, now);
      expect(w.canSubmit).toBe(false);
      expect(w.reason).toBe('PAST_DUE');
    });

    it('quá hạn nhưng cho phép nộp trễ → vẫn nộp được và bị đánh dấu trễ', () => {
      const w = SubmissionService.computeWindow({ ...pastDueAssignment, allowLateSubmission: true }, now);
      expect(w).toEqual({ isPastDue: true, canSubmit: true, wouldBeLate: true, reason: null });
    });

    it('chưa đến thời gian mở / đã đóng / khóa học lưu trữ / bản nháp', () => {
      expect(SubmissionService.computeWindow({ ...openAssignment, openAt: new Date('2026-10-16T00:00:00.000Z') }, now).reason).toBe('NOT_OPEN');
      expect(SubmissionService.computeWindow({ ...openAssignment, status: ActivityStatus.CLOSED }, now).reason).toBe('CLOSED');
      expect(SubmissionService.computeWindow({ ...openAssignment, course: { status: CourseStatus.ARCHIVED } }, now).reason).toBe('COURSE_ARCHIVED');
      expect(SubmissionService.computeWindow({ ...openAssignment, status: ActivityStatus.DRAFT }, now).reason).toBe('DRAFT');
    });
  });

  describe('getMySubmission', () => {
    it('trả về null khi chưa nộp kèm cửa sổ nộp và quy tắc tệp', async () => {
      const res = await service.getMySubmission(courseId, assignmentId, studentId);
      expect(res.submission).toBeNull();
      expect(res.window.canSubmit).toBe(true);
      expect(res.rules.maxFileBytes).toBe(20 * 1024 * 1024);
      expect(res.rules.blockedExtensions).toContain('.exe');
    });

    it('bài nộp đã chấm → không cho sửa (GRADED) và kèm điểm', async () => {
      prisma.submission.findUnique.mockResolvedValue(submissionRow({ status: SubmissionStatus.GRADED }));
      prisma.gradeItem.findUnique.mockResolvedValue({ id: 5n });
      prisma.grade.findMany.mockResolvedValue([{ studentId, score: { toFixed: () => '8.50' } }]);

      const res = await service.getMySubmission(courseId, assignmentId, studentId);
      expect(res.window).toMatchObject({ canSubmit: false, reason: 'GRADED' });
      expect(res.submission?.score).toBe('8.50');
    });

    it('sinh viên không xem được bài tập nháp', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ ...openAssignment, status: ActivityStatus.DRAFT });
      await expect(service.getMySubmission(courseId, assignmentId, studentId)).rejects.toThrow(ForbiddenException);
    });

    it('bài tập không thuộc khóa học → 404', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ ...openAssignment, courseId: 2n });
      await expect(service.getMySubmission(courseId, assignmentId, studentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsert', () => {
    it('nộp bài làm trực tuyến: làm sạch HTML, submittedAt = hiện tại, không trễ', async () => {
      await service.upsert(courseId, assignmentId, studentId, {
        content: '<p>Bài làm <script>alert(1)</script><b>đậm</b></p>',
      });

      expect(prisma.submission.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            content: '<p>Bài làm <b>đậm</b></p>',
            isLate: false,
            submittedAt: now,
            status: SubmissionStatus.SUBMITTED,
          }),
        }),
      );
      expect(cloudinary.uploadFile).not.toHaveBeenCalled();
    });

    it('nộp sau hạn khi bài tập cho phép → isLate = true', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ ...pastDueAssignment, allowLateSubmission: true });
      await service.upsert(courseId, assignmentId, studentId, { content: '<p>Trễ</p>' });
      expect(prisma.submission.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ isLate: true }) }),
      );
    });

    it('nộp sau hạn khi KHÔNG cho phép nộp trễ → 409', async () => {
      prisma.assignment.findUnique.mockResolvedValue(pastDueAssignment);
      await expect(
        service.upsert(courseId, assignmentId, studentId, { content: '<p>Trễ</p>' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.submission.upsert).not.toHaveBeenCalled();
    });

    it('giáo viên tắt bài làm trực tuyến → chặn nội dung text ở backend', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ ...openAssignment, allowTextSubmission: false });
      await expect(
        service.upsert(courseId, assignmentId, studentId, { content: '<p>Văn bản</p>' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('giáo viên tắt đính kèm tệp → chặn tệp ở backend (và dọn tệp tạm)', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ ...openAssignment, allowFileSubmission: false });
      await expect(
        service.upsert(courseId, assignmentId, studentId, {}, tmpFile()),
      ).rejects.toThrow(BadRequestException);
      expect(cloudinary.uploadFile).not.toHaveBeenCalled();
    });

    it('bài nộp trống (không text, không tệp) → 400', async () => {
      await expect(
        service.upsert(courseId, assignmentId, studentId, { content: '<p>   </p>' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nộp tệp: kiểm tra tệp, tải lên thư mục bài nộp (authenticated) rồi ghi Resource SUBMISSION', async () => {
      await service.upsert(courseId, assignmentId, studentId, {}, tmpFile());

      expect(uploads.validateFile).toHaveBeenCalled();
      expect(uploads.assertSafeContent).toHaveBeenCalled();
      expect(uploads.buildPublicId).toHaveBeenCalledWith(
        'classroom-hub/submissions/1/100/20',
        'bai-lam.pdf',
        true,
      );
      expect(cloudinary.uploadFile).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ resourceType: 'raw', deliveryType: 'authenticated' }),
      );
      expect(prisma.resource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentType: 'SUBMISSION',
          submissionId: 900n,
          uploadedBy: studentId,
          fileName: 'bai-lam.pdf',
          fileSizeBytes: 1024n,
        }),
      });
    });

    it('sửa bài nộp với tệp mới → xóa tệp cũ (DB + Cloudinary) sau khi lưu thành công', async () => {
      const oldResource = { id: 7n, storageKey: 'raw:old' };
      prisma.submission.findUnique.mockResolvedValue(submissionRow({ resource: oldResource }));

      await service.upsert(courseId, assignmentId, studentId, {}, tmpFile());

      expect(prisma.resource.delete).toHaveBeenCalledWith({ where: { id: 7n } });
      expect(cloudinary.destroy).toHaveBeenCalledWith('raw:old');
    });

    it('sửa bài nộp chỉ gỡ tệp (removeFile) nhưng còn text → vẫn hợp lệ', async () => {
      prisma.submission.findUnique.mockResolvedValue(submissionRow({ resource: { id: 7n, storageKey: 'raw:old' } }));
      await service.upsert(courseId, assignmentId, studentId, { content: '<p>Giữ text</p>', removeFile: true });
      expect(prisma.resource.delete).toHaveBeenCalledWith({ where: { id: 7n } });
      expect(cloudinary.destroy).toHaveBeenCalledWith('raw:old');
    });

    it('gỡ tệp mà không còn text → 400 (bài nộp trống)', async () => {
      prisma.submission.findUnique.mockResolvedValue(
        submissionRow({ content: null, resource: { id: 7n, storageKey: 'raw:old' } }),
      );
      await expect(
        service.upsert(courseId, assignmentId, studentId, { removeFile: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ghi DB lỗi sau khi upload → dọn tệp vừa tải lên Cloudinary', async () => {
      prisma.$transaction.mockRejectedValue(new Error('db down'));
      await expect(service.upsert(courseId, assignmentId, studentId, {}, tmpFile())).rejects.toThrow('db down');
      expect(cloudinary.destroy).toHaveBeenCalledWith('raw:classroom-hub/submissions/1/100/20/x.pdf');
    });

    it('bài nộp đã chấm → không cho sửa (409)', async () => {
      prisma.submission.findUnique.mockResolvedValue(submissionRow({ status: SubmissionStatus.GRADED }));
      await expect(
        service.upsert(courseId, assignmentId, studentId, { content: '<p>Sửa</p>' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('xóa bài nộp và tệp trên Cloudinary', async () => {
      prisma.submission.findUnique.mockResolvedValue(submissionRow({ resource: { id: 7n, storageKey: 'raw:old' } }));
      await service.remove(courseId, assignmentId, studentId);
      expect(prisma.submission.delete).toHaveBeenCalledWith({ where: { id: 900n } });
      expect(cloudinary.destroy).toHaveBeenCalledWith('raw:old');
    });

    it('chưa nộp → 404; đã chấm → 409; hết hạn (không nộp trễ) → 409', async () => {
      await expect(service.remove(courseId, assignmentId, studentId)).rejects.toThrow(NotFoundException);

      prisma.submission.findUnique.mockResolvedValue(submissionRow({ status: SubmissionStatus.GRADED }));
      await expect(service.remove(courseId, assignmentId, studentId)).rejects.toThrow(ConflictException);

      prisma.submission.findUnique.mockResolvedValue(submissionRow());
      prisma.assignment.findUnique.mockResolvedValue(pastDueAssignment);
      await expect(service.remove(courseId, assignmentId, studentId)).rejects.toThrow(ConflictException);
      expect(prisma.submission.delete).not.toHaveBeenCalled();
    });
  });

  describe('listForTeacher', () => {
    it('liệt kê theo sinh viên đang tham gia, đếm đã nộp / nộp trễ / chưa nộp', async () => {
      const s2 = { id: 21n, fullName: 'Lê Hoàng Nam', email: 's2@x.vn', avatarUrl: null };
      const s3 = { id: 22n, fullName: 'Võ Thanh Hà', email: 's3@x.vn', avatarUrl: null };
      prisma.enrollment.findMany.mockResolvedValue([{ student }, { student: s2 }, { student: s3 }]);
      prisma.submission.findMany.mockResolvedValue([
        submissionRow(),
        submissionRow({ id: 901n, studentId: 21n, student: s2, isLate: true }),
      ]);

      const res = await service.listForTeacher(courseId, assignmentId);

      expect(res.summary).toEqual({ enrolled: 3, submitted: 2, notSubmitted: 1, late: 1, graded: 0 });
      expect(res.rows.map((r) => [r.student.fullName, r.submission?.isLate ?? null])).toEqual([
        ['Trần Thị Mai', false],
        ['Lê Hoàng Nam', true],
        ['Võ Thanh Hà', null],
      ]);
    });
  });
});
