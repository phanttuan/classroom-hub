import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ResourceService, UserContext } from './resource.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  UserRole,
  LessonStatus,
  EnrollmentStatus,
  ResourceParent,
} from '../../generated/prisma/enums.js';

describe('ResourceService', () => {
  let service: ResourceService;
  let prisma: any;
  let cloudinaryService: CloudinaryService;

  const mockCourse = {
    id: 10n,
    ownerId: 100n, // Teacher ID
    courseCode: 'CS101',
    name: 'Nhập khóa học lập trình',
  };

  const mockModule = {
    id: 20n,
    courseId: 10n,
    title: 'Chương 1',
    orderIndex: 1,
    course: mockCourse,
  };

  const mockPublishedLesson = {
    id: 30n,
    moduleId: 20n,
    title: 'Bài 1: Cú pháp cơ bản',
    status: LessonStatus.PUBLISHED,
    module: mockModule,
  };

  const mockDraftLesson = {
    id: 31n,
    moduleId: 20n,
    title: 'Bài 2: Bản nháp',
    status: LessonStatus.DRAFT,
    module: mockModule,
  };

  const mockResource = {
    id: 40n,
    parentType: ResourceParent.LESSON,
    lessonId: 30n,
    uploadedBy: 100n,
    fileName: 'de-cuong.pdf',
    storageKey: 'raw:classroom-hub/lessons/30/de-cuong.pdf',
    fileSizeBytes: 245760n,
    mimeType: 'application/pdf',
    createdAt: new Date(),
    lesson: mockPublishedLesson,
  };

  const mockDraftResource = {
    id: 41n,
    parentType: ResourceParent.LESSON,
    lessonId: 31n,
    uploadedBy: 100n,
    fileName: 'nhap.pdf',
    storageKey: 'raw:classroom-hub/lessons/31/nhap.pdf',
    fileSizeBytes: 1024n,
    mimeType: 'application/pdf',
    createdAt: new Date(),
    lesson: mockDraftLesson,
  };

  const teacherUser: UserContext = { id: 100n, role: UserRole.TEACHER };
  const otherTeacherUser: UserContext = { id: 101n, role: UserRole.TEACHER };
  const studentUser: UserContext = { id: 200n, role: UserRole.STUDENT };
  const adminUser: UserContext = { id: 999n, role: UserRole.ADMIN };

  beforeEach(() => {
    prisma = {
      resource: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      lesson: {
        findUnique: vi.fn(),
      },
      enrollment: {
        findUnique: vi.fn(),
      },
    };

    const mockConfigService: any = {
      get: (key: string) => {
        if (key === 'CLOUDINARY_CLOUD_NAME') return 'test-cloud';
        if (key === 'CLOUDINARY_API_KEY') return 'test-key';
        if (key === 'CLOUDINARY_API_SECRET') return 'test-secret';
        return undefined;
      },
    };
    cloudinaryService = new CloudinaryService(mockConfigService);

    service = new ResourceService(
      prisma as unknown as PrismaService,
      cloudinaryService,
    );
  });

  describe('getLessonResources', () => {
    it('Giáo viên phụ trách khóa học xem được danh sách tài liệu', async () => {
      prisma.lesson.findUnique.mockResolvedValue(mockPublishedLesson);
      prisma.resource.findMany.mockResolvedValue([mockResource]);

      const result = await service.getLessonResources(teacherUser, 30n);
      expect(result).toHaveLength(1);
      expect(result[0].fileName).toBe('de-cuong.pdf');
    });

    it('Admin hệ thống có quyền xem danh sách tài liệu', async () => {
      prisma.lesson.findUnique.mockResolvedValue(mockDraftLesson);
      prisma.resource.findMany.mockResolvedValue([mockDraftResource]);

      const result = await service.getLessonResources(adminUser, 31n);
      expect(result).toHaveLength(1);
      expect(result[0].fileName).toBe('nhap.pdf');
    });

    it('Giáo viên không phụ trách khóa học bị chặn 403', async () => {
      prisma.lesson.findUnique.mockResolvedValue(mockPublishedLesson);

      await expect(
        service.getLessonResources(otherTeacherUser, 30n),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Học sinh có enrollment ACTIVE xem được tài liệu bài học PUBLISHED', async () => {
      prisma.lesson.findUnique.mockResolvedValue(mockPublishedLesson);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 1n,
        courseId: 10n,
        studentId: 200n,
        status: EnrollmentStatus.ACTIVE,
      });
      prisma.resource.findMany.mockResolvedValue([mockResource]);

      const result = await service.getLessonResources(studentUser, 30n);
      expect(result).toHaveLength(1);
      expect(result[0].fileName).toBe('de-cuong.pdf');
    });

    it('Học sinh xem bài học DRAFT bị chặn 403', async () => {
      prisma.lesson.findUnique.mockResolvedValue(mockDraftLesson);

      await expect(
        service.getLessonResources(studentUser, 31n),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Học sinh chưa enroll bị chặn 403', async () => {
      prisma.lesson.findUnique.mockResolvedValue(mockPublishedLesson);
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.getLessonResources(studentUser, 30n),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Học sinh bị gỡ (REMOVED) khỏi khóa học bị chặn 403', async () => {
      prisma.lesson.findUnique.mockResolvedValue(mockPublishedLesson);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 1n,
        courseId: 10n,
        studentId: 200n,
        status: EnrollmentStatus.REMOVED,
      });

      await expect(
        service.getLessonResources(studentUser, 30n),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Bài học không tồn tại trả về 404', async () => {
      prisma.lesson.findUnique.mockResolvedValue(null);

      await expect(
        service.getLessonResources(studentUser, 999n),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPreviewUrl', () => {
    it('Học sinh hợp lệ nhận được signed preview URL có thời hạn 10 phút', async () => {
      prisma.resource.findUnique.mockResolvedValue(mockResource);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 1n,
        courseId: 10n,
        studentId: 200n,
        status: EnrollmentStatus.ACTIVE,
      });

      const result = await service.getPreviewUrl(studentUser, 40n);

      expect(result.expiresIn).toBe(600);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileName).toBe('de-cuong.pdf');
      expect(result.url).toContain('https://api.cloudinary.com/v1_1/test-cloud/raw/download?');
      expect(result.url).not.toContain('attachment=true');
      expect(result.url).toMatch(/(?:exp|expires_at)=(\d+)/);
    });

    it('Giáo viên xem được tài liệu của bài học DRAFT', async () => {
      prisma.resource.findUnique.mockResolvedValue(mockDraftResource);

      const result = await service.getPreviewUrl(teacherUser, 41n);
      expect(result.expiresIn).toBe(600);
      expect(result.fileName).toBe('nhap.pdf');
    });

    it('Học sinh xem tài liệu của bài học DRAFT bị chặn 403', async () => {
      prisma.resource.findUnique.mockResolvedValue(mockDraftResource);

      await expect(
        service.getPreviewUrl(studentUser, 41n),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Tài liệu không tồn tại trả về 404', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);

      await expect(
        service.getPreviewUrl(studentUser, 999n),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDownloadUrl', () => {
    it('Trả về URL có kèm cờ attachment để tải về máy', async () => {
      prisma.resource.findUnique.mockResolvedValue(mockResource);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 1n,
        courseId: 10n,
        studentId: 200n,
        status: EnrollmentStatus.ACTIVE,
      });

      const result = await service.getDownloadUrl(studentUser, 40n);

      expect(result.expiresIn).toBe(600);
      expect(result.url).toContain('attachment=true');
      expect(result.fileName).toBe('de-cuong.pdf');
    });

    it('Học sinh bị gỡ (REMOVED) khi tải file bị chặn 403', async () => {
      prisma.resource.findUnique.mockResolvedValue(mockResource);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 1n,
        courseId: 10n,
        studentId: 200n,
        status: EnrollmentStatus.REMOVED,
      });

      await expect(
        service.getDownloadUrl(studentUser, 40n),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
