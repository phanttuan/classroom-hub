import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ResourceUploadService } from './resource-upload.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  UserRole,
  EnrollmentStatus,
} from '../../generated/prisma/enums.js';

describe('ResourceUploadService - generateContentAttachmentUrl', () => {
  let service: ResourceUploadService;
  let mockPrisma: any;
  let mockCloudinary: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      course: { findUnique: vi.fn() },
      enrollment: { findUnique: vi.fn() },
    };
    mockCloudinary = {
      parseStorageKey: vi.fn(),
      generateSignedUrl: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('50'),
    };
    service = new ResourceUploadService(
      mockPrisma as unknown as PrismaService,
      mockCloudinary as unknown as CloudinaryService,
      mockConfigService,
    );
  });

  const courseId = 10n;
  const storageKey = 'raw:classroom-hub/content-attachments/10/assignment-spec.pdf';

  it('báo lỗi BadRequestException khi storageKey rỗng', async () => {
    await expect(
      service.generateContentAttachmentUrl(
        { id: 1n, role: UserRole.ADMIN },
        courseId,
        '',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('báo lỗi NotFoundException khi khóa học không tồn tại', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);

    await expect(
      service.generateContentAttachmentUrl(
        { id: 1n, role: UserRole.ADMIN },
        courseId,
        storageKey,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('cho phép ADMIN tải tệp đính kèm', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 10n,
      ownerId: 200n,
      status: 'PUBLISHED',
    });
    mockCloudinary.parseStorageKey.mockReturnValue({
      resourceType: 'raw',
      publicId: 'classroom-hub/content-attachments/10/assignment-spec.pdf',
    });
    mockCloudinary.generateSignedUrl.mockReturnValue({
      url: 'https://res.cloudinary.com/demo/signed-download',
      expiresIn: 600,
    });

    const result = await service.generateContentAttachmentUrl(
      { id: 1n, role: UserRole.ADMIN },
      courseId,
      storageKey,
      'assignment-spec.pdf',
    );

    expect(result.url).toBe('https://res.cloudinary.com/demo/signed-download');
    expect(result.expiresIn).toBe(600);
    expect(result.fileName).toBe('assignment-spec.pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('cho phép TEACHER sở hữu khóa học tải tệp đính kèm', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 10n,
      ownerId: 100n,
      status: 'PUBLISHED',
    });
    mockCloudinary.parseStorageKey.mockReturnValue({
      resourceType: 'raw',
      publicId: 'classroom-hub/content-attachments/10/assignment-spec.pdf',
    });
    mockCloudinary.generateSignedUrl.mockReturnValue({
      url: 'https://res.cloudinary.com/demo/signed-download',
      expiresIn: 600,
    });

    const result = await service.generateContentAttachmentUrl(
      { id: 100n, role: UserRole.TEACHER },
      courseId,
      storageKey,
      'assignment-spec.pdf',
    );

    expect(result.url).toBe('https://res.cloudinary.com/demo/signed-download');
  });

  it('báo lỗi ForbiddenException khi TEACHER không phải owner', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 10n,
      ownerId: 200n,
      status: 'PUBLISHED',
    });

    await expect(
      service.generateContentAttachmentUrl(
        { id: 100n, role: UserRole.TEACHER },
        courseId,
        storageKey,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('cho phép STUDENT có Enrollment ACTIVE tải tệp đính kèm', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 10n,
      ownerId: 200n,
      status: 'PUBLISHED',
    });
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      status: EnrollmentStatus.ACTIVE,
    });
    mockCloudinary.parseStorageKey.mockReturnValue({
      resourceType: 'raw',
      publicId: 'classroom-hub/content-attachments/10/assignment-spec.pdf',
    });
    mockCloudinary.generateSignedUrl.mockReturnValue({
      url: 'https://res.cloudinary.com/demo/signed-student',
      expiresIn: 600,
    });

    const result = await service.generateContentAttachmentUrl(
      { id: 300n, role: UserRole.STUDENT },
      courseId,
      storageKey,
    );

    expect(result.url).toBe('https://res.cloudinary.com/demo/signed-student');
    expect(result.expiresIn).toBe(600);
  });

  it('báo lỗi ForbiddenException khi STUDENT chưa đăng ký khóa học', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 10n,
      ownerId: 200n,
      status: 'PUBLISHED',
    });
    mockPrisma.enrollment.findUnique.mockResolvedValue(null);

    await expect(
      service.generateContentAttachmentUrl(
        { id: 300n, role: UserRole.STUDENT },
        courseId,
        storageKey,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('báo lỗi ForbiddenException khi storageKey không thuộc thư mục khóa học', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 10n,
      ownerId: 100n,
      status: 'PUBLISHED',
    });
    mockCloudinary.parseStorageKey.mockReturnValue({
      resourceType: 'raw',
      publicId: 'classroom-hub/content-attachments/999/malicious.pdf',
    });

    await expect(
      service.generateContentAttachmentUrl(
        { id: 100n, role: UserRole.TEACHER },
        courseId,
        'raw:classroom-hub/content-attachments/999/malicious.pdf',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
