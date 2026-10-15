import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ActivityStatus,
  GradeCategory,
  SubmissionStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

describe('AssignmentService', () => {
  let service: AssignmentService;
  let prisma: {
    assignment: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    module: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    gradeItem: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    submission: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const teacherId = 10n;
  const studentId = 20n;
  const courseId = 1n;
  const moduleId = 50n;
  const assignmentId = 100n;
  const gradeItemId = 500n;

  const baseAssignment = {
    id: assignmentId,
    courseId,
    moduleId,
    createdBy: teacherId,
    title: 'Bài tập 1',
    description: 'Mô tả bài tập 1',
    maxScore: new Prisma.Decimal(10),
    openAt: new Date('2026-10-15T08:00:00.000Z'),
    dueAt: new Date('2026-10-20T23:59:59.000Z'),
    status: ActivityStatus.DRAFT,
    publishedAt: null,
    createdAt: new Date('2026-10-13T00:00:00.000Z'),
    updatedAt: new Date('2026-10-13T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      assignment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      module: {
        findUnique: vi.fn().mockResolvedValue({ id: moduleId, courseId }),
      },
      gradeItem: {
        create: vi.fn(),
        update: vi.fn(),
      },
      submission: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (cb: (tx: typeof prisma) => Promise<unknown>) =>
        cb(prisma),
      ),
    };
    service = new AssignmentService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should create assignment (DRAFT) and GradeItem (ASSIGNMENT) in the same transaction', async () => {
      prisma.assignment.create.mockResolvedValue(baseAssignment);
      prisma.gradeItem.create.mockResolvedValue({
        id: gradeItemId,
        courseId,
        category: GradeCategory.ASSIGNMENT,
        assignmentId,
        maxScore: new Prisma.Decimal(10),
      });

      const result = await service.create(teacherId, courseId, {
        moduleId: '50',
        title: 'Bài tập 1',
        description: 'Mô tả bài tập 1',
        maxScore: 10,
        openAt: '2026-10-15T08:00:00.000Z',
        dueAt: '2026-10-20T23:59:59.000Z',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.assignment.create).toHaveBeenCalledWith({
        data: {
          courseId,
          moduleId,
          createdBy: teacherId,
          title: 'Bài tập 1',
          description: 'Mô tả bài tập 1',
          maxScore: new Prisma.Decimal(10),
          openAt: new Date('2026-10-15T08:00:00.000Z'),
          dueAt: new Date('2026-10-20T23:59:59.000Z'),
          status: ActivityStatus.DRAFT,
          // Mặc định: không nộp trễ, nhận cả bài làm trực tuyến lẫn tệp
          allowLateSubmission: false,
          allowTextSubmission: true,
          allowFileSubmission: true,
        },
      });
      expect(prisma.gradeItem.create).toHaveBeenCalledWith({
        data: {
          courseId,
          category: GradeCategory.ASSIGNMENT,
          assignmentId,
          maxScore: new Prisma.Decimal(10),
        },
      });
      expect(result).toMatchObject({
        id: '100',
        courseId: '1',
        moduleId: '50',
        createdBy: '10',
        title: 'Bài tập 1',
        maxScore: '10.00',
        status: ActivityStatus.DRAFT,
        gradeItemId: '500',
      });
    });

    it('should throw BadRequestException when both text and file submission are disabled', async () => {
      await expect(
        service.create(teacherId, courseId, {
          moduleId: '50',
          title: 'Bài tập 1',
          maxScore: 10,
          openAt: '2026-10-15T08:00:00.000Z',
          dueAt: '2026-10-20T23:59:59.000Z',
          allowTextSubmission: false,
          allowFileSubmission: false,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when module does not exist or belongs to another course', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(
        service.create(teacherId, courseId, {
          moduleId: '999',
          title: 'Bài tập 1',
          maxScore: 10,
          openAt: '2026-10-15T08:00:00.000Z',
          dueAt: '2026-10-20T23:59:59.000Z',
        }),
      ).rejects.toThrow('Topic (moduleId) không tồn tại hoặc không thuộc khóa học này');
    });

    it('should throw BadRequestException when dueAt <= openAt', async () => {
      await expect(
        service.create(teacherId, courseId, {
          moduleId: '50',
          title: 'Bài tập lỗi hạn nộp',
          maxScore: 10,
          openAt: '2026-10-20T10:00:00.000Z',
          dueAt: '2026-10-20T09:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should filter PUBLISHED and CLOSED for student and attach mySubmission', async () => {
      const publishedAssignment = {
        ...baseAssignment,
        status: ActivityStatus.PUBLISHED,
      };
      prisma.assignment.findMany.mockResolvedValue([publishedAssignment]);
      // Một truy vấn lấy toàn bộ bài nộp của sinh viên (không N+1 theo từng bài tập)
      prisma.submission.findMany.mockResolvedValue([
        {
          id: 900n,
          assignmentId,
          studentId,
          status: SubmissionStatus.SUBMITTED,
          isLate: true,
          submittedAt: new Date('2026-10-16T10:00:00.000Z'),
        },
      ]);

      const result = await service.findAll(courseId, {
        id: studentId,
        role: UserRole.STUDENT,
      });

      expect(prisma.assignment.findMany).toHaveBeenCalledWith({
        where: {
          courseId,
          status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.CLOSED] },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.submission.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: { studentId, assignmentId: { in: [assignmentId] } },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.mySubmission).toEqual({
        id: '900',
        status: SubmissionStatus.SUBMITTED,
        isLate: true,
        submittedAt: new Date('2026-10-16T10:00:00.000Z'),
      });
    });

    it('should return all assignments for teacher and support status filter', async () => {
      prisma.assignment.findMany.mockResolvedValue([
        { ...baseAssignment, submissions: [{ isLate: false }, { isLate: true }] },
      ]);

      const result = await service.findAll(
        courseId,
        { id: teacherId, role: UserRole.TEACHER },
        'DRAFT',
      );

      expect(prisma.assignment.findMany).toHaveBeenCalledWith({
        where: { courseId, status: ActivityStatus.DRAFT },
        orderBy: { createdAt: 'desc' },
        include: { submissions: { select: { isLate: true } } },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('mySubmission');
      // Giáo viên thấy số bài đã nộp / nộp trễ
      expect(result[0]?.submissionStats).toEqual({ submitted: 2, late: 1 });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when assignment does not exist', async () => {
      prisma.assignment.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(courseId, 999n, {
          id: teacherId,
          role: UserRole.TEACHER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when student accesses DRAFT assignment', async () => {
      prisma.assignment.findUnique.mockResolvedValue(baseAssignment);

      await expect(
        service.findOne(courseId, assignmentId, {
          id: studentId,
          role: UserRole.STUDENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return PUBLISHED assignment with mySubmission: null for student who has not submitted', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...baseAssignment,
        status: ActivityStatus.PUBLISHED,
      });
      prisma.submission.findUnique.mockResolvedValue(null);

      const result = await service.findOne(courseId, assignmentId, {
        id: studentId,
        role: UserRole.STUDENT,
      });

      expect(result.mySubmission).toBeNull();
    });
  });

  describe('update', () => {
    it('should throw ConflictException (409) when assignment is CLOSED', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...baseAssignment,
        status: ActivityStatus.CLOSED,
      });

      await expect(
        service.update(teacherId, courseId, assignmentId, {
          title: 'Tiêu đề mới',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.assignment.update).not.toHaveBeenCalled();
    });

    it('should allow editing a PUBLISHED assignment (extend due date, enable late submission)', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...baseAssignment,
        status: ActivityStatus.PUBLISHED,
      });
      prisma.assignment.update.mockResolvedValue({
        ...baseAssignment,
        status: ActivityStatus.PUBLISHED,
        dueAt: new Date('2026-10-25T23:59:59.000Z'),
        allowLateSubmission: true,
      });

      const result = await service.update(teacherId, courseId, assignmentId, {
        dueAt: '2026-10-25T23:59:59.000Z',
        allowLateSubmission: true,
      });

      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: assignmentId },
        data: expect.objectContaining({
          dueAt: new Date('2026-10-25T23:59:59.000Z'),
          allowLateSubmission: true,
          allowTextSubmission: true,
          allowFileSubmission: true,
        }),
      });
      expect(result.allowLateSubmission).toBe(true);
    });

    it('should update both assignment and GradeItem.maxScore in transaction when maxScore changes', async () => {
      prisma.assignment.findUnique.mockResolvedValue(baseAssignment);
      prisma.assignment.update.mockResolvedValue({
        ...baseAssignment,
        title: 'Bài tập cập nhật',
        maxScore: new Prisma.Decimal(20),
      });
      prisma.gradeItem.update.mockResolvedValue({
        id: gradeItemId,
        assignmentId,
        maxScore: new Prisma.Decimal(20),
      });

      const result = await service.update(teacherId, courseId, assignmentId, {
        title: 'Bài tập cập nhật',
        maxScore: 20,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: assignmentId },
        data: {
          title: 'Bài tập cập nhật',
          maxScore: new Prisma.Decimal(20),
        },
      });
      expect(prisma.gradeItem.update).toHaveBeenCalledWith({
        where: { assignmentId },
        data: { maxScore: new Prisma.Decimal(20) },
      });
      expect(result.maxScore).toBe('20.00');
    });

    it('should throw BadRequestException when updated dueAt <= openAt', async () => {
      prisma.assignment.findUnique.mockResolvedValue(baseAssignment);

      await expect(
        service.update(teacherId, courseId, assignmentId, {
          dueAt: '2026-10-14T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publish', () => {
    it('should publish DRAFT assignment when dueAt > openAt', async () => {
      prisma.assignment.findUnique.mockResolvedValue(baseAssignment);
      const publishedAt = new Date();
      prisma.assignment.update.mockResolvedValue({
        ...baseAssignment,
        status: ActivityStatus.PUBLISHED,
        publishedAt,
      });

      const result = await service.publish(courseId, assignmentId);

      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: assignmentId },
        data: {
          status: ActivityStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe(ActivityStatus.PUBLISHED);
    });

    it('should throw BadRequestException (400) when publishing assignment with dueAt <= openAt', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...baseAssignment,
        openAt: new Date('2026-10-20T10:00:00.000Z'),
        dueAt: new Date('2026-10-20T10:00:00.000Z'),
      });

      await expect(service.publish(courseId, assignmentId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.assignment.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException (409) when publishing non-DRAFT assignment', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...baseAssignment,
        status: ActivityStatus.PUBLISHED,
      });

      await expect(service.publish(courseId, assignmentId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('close', () => {
    it('should close PUBLISHED assignment', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...baseAssignment,
        status: ActivityStatus.PUBLISHED,
      });
      prisma.assignment.update.mockResolvedValue({
        ...baseAssignment,
        status: ActivityStatus.CLOSED,
      });

      const result = await service.close(courseId, assignmentId);

      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: assignmentId },
        data: { status: ActivityStatus.CLOSED },
      });
      expect(result.status).toBe(ActivityStatus.CLOSED);
    });

    it('should throw ConflictException (409) when closing DRAFT assignment', async () => {
      prisma.assignment.findUnique.mockResolvedValue(baseAssignment);

      await expect(service.close(courseId, assignmentId)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.assignment.update).not.toHaveBeenCalled();
    });
  });
});

