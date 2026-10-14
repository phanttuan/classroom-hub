import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ResourceUploadController } from './resource-upload.controller.js';
import { ResourceUploadService } from './resource-upload.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('ResourceUploadController', () => {
  let controller: ResourceUploadController;
  let mockUploadService: any;

  const mockUserReq: any = {
    user: {
      id: '123',
      role: UserRole.STUDENT,
      fullName: 'Nguyen Van A',
      email: 'a@example.com',
    },
    headers: {},
    query: {},
  };

  const mockRes: any = {
    redirect: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    mockUploadService = {
      uploadLessonFiles: vi.fn(),
      deleteResource: vi.fn(),
      uploadContentImage: vi.fn(),
      uploadContentAttachment: vi.fn(),
      generateContentAttachmentUrl: vi.fn(),
    };
    controller = new ResourceUploadController(
      mockUploadService as unknown as ResourceUploadService,
    );
    mockRes.redirect.mockClear();
    mockRes.status.mockClear();
    mockRes.json.mockClear();
  });

  describe('downloadContentAttachment', () => {
    it('báo lỗi BadRequestException khi courseId không hợp lệ', async () => {
      await expect(
        controller.downloadContentAttachment(
          mockUserReq,
          mockRes,
          'invalid',
          'raw:classroom-hub/content-attachments/1/file.pdf',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('báo lỗi BadRequestException khi thiếu keyParam', async () => {
      await expect(
        controller.downloadContentAttachment(
          mockUserReq,
          mockRes,
          '1',
          '',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('chuyển hướng (redirect) 302 đến signed URL khi client là trình duyệt', async () => {
      const mockResult = {
        url: 'https://res.cloudinary.com/demo/image/upload/s--abc--/v1/classroom-hub/content-attachments/1/file.pdf',
        expiresIn: 600,
        mimeType: 'application/pdf',
        fileName: 'file.pdf',
      };
      mockUploadService.generateContentAttachmentUrl.mockResolvedValue(mockResult);

      await controller.downloadContentAttachment(
        mockUserReq,
        mockRes,
        '1',
        'raw:classroom-hub/content-attachments/1/file.pdf',
        'file.pdf',
      );

      expect(mockUploadService.generateContentAttachmentUrl).toHaveBeenCalledWith(
        { id: 123n, role: UserRole.STUDENT },
        1n,
        'raw:classroom-hub/content-attachments/1/file.pdf',
        'file.pdf',
        true,
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(mockResult.url);
    });

    it('trả về JSON khi request có Accept: application/json', async () => {
      const jsonReq: any = {
        ...mockUserReq,
        headers: { accept: 'application/json' },
        query: {},
      };
      const mockResult = {
        url: 'https://res.cloudinary.com/demo/image/upload/s--abc--/v1/classroom-hub/content-attachments/1/file.pdf',
        expiresIn: 600,
        mimeType: 'application/pdf',
        fileName: 'file.pdf',
      };
      mockUploadService.generateContentAttachmentUrl.mockResolvedValue(mockResult);

      await controller.downloadContentAttachment(
        jsonReq,
        mockRes,
        '1',
        'raw:classroom-hub/content-attachments/1/file.pdf',
        'file.pdf',
        'preview',
      );

      expect(mockUploadService.generateContentAttachmentUrl).toHaveBeenCalledWith(
        { id: 123n, role: UserRole.STUDENT },
        1n,
        'raw:classroom-hub/content-attachments/1/file.pdf',
        'file.pdf',
        false,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Lấy đường dẫn tải thành công',
        data: mockResult,
      });
    });
  });
});

