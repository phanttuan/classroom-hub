import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { LearningContentService } from './learning-content.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CloudinaryService } from '../resource/cloudinary.service.js';
import { UserRole, LessonStatus, EnrollmentStatus } from '../../generated/prisma/enums.js';

describe('LearningContentService', () => {
  let service: LearningContentService;
  let prisma: {
    course: { findUnique: ReturnType<typeof vi.fn> };
    enrollment: { findUnique: ReturnType<typeof vi.fn> };
    module: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    lesson: {
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    lessonProgress: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    resource: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  let cloudinary: { destroyMany: ReturnType<typeof vi.fn> };

  const teacherId = 10n;
  const studentId = 20n;
  const courseId = 1n;

  beforeEach(() => {
    prisma = {
      course: { findUnique: vi.fn() },
      enrollment: { findUnique: vi.fn() },
      module: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      lesson: {
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      lessonProgress: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      resource: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(),
    };
    cloudinary = { destroyMany: vi.fn() };
    service = new LearningContentService(
      prisma as unknown as PrismaService,
      cloudinary as unknown as CloudinaryService,
    );
  });

  describe('getCourseContent', () => {
    const courseWithModules = {
      id: courseId,
      ownerId: teacherId,
      courseCode: 'WEB301',
      name: 'Lập trình Web',
      modules: [
        {
          id: 100n,
          courseId,
          title: 'Chương 1',
          orderIndex: 1,
          lessons: [
            { id: 1000n, title: 'Bài 1', progresses: [{ isCompleted: true, completedAt: new Date() }] },
            { id: 1001n, title: 'Bài 2', progresses: [] },
          ],
        },
      ],
    };

    it('trả về nội dung kèm tiến độ cho sinh viên đã ghi danh', async () => {
      prisma.course.findUnique
        .mockResolvedValueOnce({ ownerId: teacherId })
        .mockResolvedValueOnce(courseWithModules);
      prisma.enrollment.findUnique.mockResolvedValue({ status: EnrollmentStatus.ACTIVE });

      const result = await service.getCourseContent(studentId, UserRole.STUDENT, courseId);

      expect(prisma.enrollment.findUnique).toHaveBeenCalledWith({
        where: { uk_enrollments_course_student: { courseId, studentId } },
      });
      expect(result.totalLessons).toBe(2);
      expect(result.completedLessons).toBe(1);
      expect(result.progressPercent).toBe(50);
      expect(result.modules[0].lessons[0]).not.toHaveProperty('progresses');
      expect(result.modules[0].lessons[0].isCompleted).toBe(true);
    });

    it('chỉ lấy bài học PUBLISHED khi là sinh viên', async () => {
      prisma.course.findUnique
        .mockResolvedValueOnce({ ownerId: teacherId })
        .mockResolvedValueOnce(courseWithModules);
      prisma.enrollment.findUnique.mockResolvedValue({ status: EnrollmentStatus.ACTIVE });

      await service.getCourseContent(studentId, UserRole.STUDENT, courseId);

      const query = prisma.course.findUnique.mock.calls[1][0];
      expect(query.select.modules.include.lessons.where).toEqual({ status: LessonStatus.PUBLISHED });
    });

    it('chặn sinh viên đã bị xóa khỏi lớp học', async () => {
      prisma.course.findUnique.mockResolvedValue({ ownerId: teacherId });
      prisma.enrollment.findUnique.mockResolvedValue({ status: EnrollmentStatus.REMOVED });

      await expect(
        service.getCourseContent(studentId, UserRole.STUDENT, courseId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('chặn giáo viên không sở hữu lớp học', async () => {
      prisma.course.findUnique.mockResolvedValue({ ownerId: 999n });

      await expect(
        service.getCourseContent(teacherId, UserRole.TEACHER, courseId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('báo 404 khi lớp học không tồn tại', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.getCourseContent(teacherId, UserRole.TEACHER, courseId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createModule', () => {
    it('tạo topic trực tiếp dưới lớp học với orderIndex kế tiếp', async () => {
      prisma.course.findUnique.mockResolvedValue({ ownerId: teacherId });
      prisma.module.findFirst.mockResolvedValue({ orderIndex: 3 });
      prisma.module.create.mockResolvedValue({ id: 5n });

      await service.createModule(teacherId, UserRole.TEACHER, courseId, { title: '  Chương 4 ' });

      expect(prisma.module.create).toHaveBeenCalledWith({
        data: { courseId, title: 'Chương 4', orderIndex: 4 },
        include: { lessons: true },
      });
    });
  });

  describe('topic mặc định "Chung"', () => {
    beforeEach(() => {
      prisma.course.findUnique.mockResolvedValue({ ownerId: teacherId });
    });

    it('không cho xóa topic mặc định', async () => {
      prisma.module.findUnique.mockResolvedValue({ courseId, isDefault: true });

      await expect(service.deleteModule(teacherId, UserRole.TEACHER, 100n)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.module.delete).not.toHaveBeenCalled();
    });

    it('không cho đổi tên topic mặc định', async () => {
      prisma.module.findUnique.mockResolvedValue({ courseId, isDefault: true });

      await expect(
        service.updateModule(teacherId, UserRole.TEACHER, 100n, { title: 'Tên khác' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.module.update).not.toHaveBeenCalled();
    });

    it('vẫn xóa được topic thường', async () => {
      prisma.module.findUnique.mockResolvedValue({ courseId, isDefault: false });

      prisma.resource.findMany.mockResolvedValue([{ storageKey: 'raw:classroom-hub/lessons/1/2/a.pdf' }]);

      await service.deleteModule(teacherId, UserRole.TEACHER, 101n);
      expect(prisma.module.delete).toHaveBeenCalledWith({ where: { id: 101n } });
      // Dọn tệp đính kèm trên Cloudinary sau khi xóa
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['raw:classroom-hub/lessons/1/2/a.pdf']);
    });

    it('reorder luôn giữ topic mặc định ở vị trí đầu', async () => {
      prisma.module.findFirst.mockResolvedValue({ id: 100n });
      prisma.module.count.mockResolvedValue(3);
      const updates: { id: bigint; orderIndex: number }[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          module: {
            update: vi.fn(async ({ where, data }: { where: { id: bigint }; data: { orderIndex: number } }) => {
              updates.push({ id: where.id, orderIndex: data.orderIndex });
            }),
          },
        }),
      );

      await service.reorderModules(teacherId, UserRole.TEACHER, courseId, ['102', '100', '101']);

      const final = updates.filter((u) => u.orderIndex > 0);
      expect(final).toEqual([
        { id: 100n, orderIndex: 1 },
        { id: 102n, orderIndex: 2 },
        { id: 101n, orderIndex: 3 },
      ]);
    });
  });

  describe('reorder', () => {
    it('từ chối reorder topic khi có ID không thuộc lớp học', async () => {
      prisma.course.findUnique.mockResolvedValue({ ownerId: teacherId });
      prisma.module.count.mockResolvedValue(1);

      await expect(
        service.reorderModules(teacherId, UserRole.TEACHER, courseId, ['100', '999']),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('từ chối reorder bài học khi có ID không thuộc topic', async () => {
      prisma.module.findUnique.mockResolvedValue({ courseId });
      prisma.course.findUnique.mockResolvedValue({ ownerId: teacherId });
      prisma.lesson.count.mockResolvedValue(0);

      await expect(
        service.reorderLessons(teacherId, UserRole.TEACHER, 100n, ['1000']),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('toggleLessonProgress', () => {
    it('kiểm tra ghi danh qua courseId của topic rồi lưu tiến độ', async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        id: 1000n,
        status: LessonStatus.PUBLISHED,
        module: { courseId },
      });
      prisma.course.findUnique.mockResolvedValue({ ownerId: teacherId });
      prisma.enrollment.findUnique.mockResolvedValue({ status: EnrollmentStatus.ACTIVE });
      prisma.lessonProgress.findUnique.mockResolvedValue(null);
      prisma.lessonProgress.upsert.mockResolvedValue({ isCompleted: true, completedAt: new Date() });

      const result = await service.toggleLessonProgress(studentId, 1000n);

      expect(prisma.course.findUnique).toHaveBeenCalledWith({
        where: { id: courseId },
        select: { ownerId: true },
      });
      expect(result.isCompleted).toBe(true);
    });

    it('không cho đánh dấu bài học chưa xuất bản', async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        id: 1000n,
        status: LessonStatus.DRAFT,
        module: { courseId },
      });

      await expect(service.toggleLessonProgress(studentId, 1000n)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
