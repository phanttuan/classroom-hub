import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  ResourceController,
  LessonResourceController,
} from './resource.controller.js';
import { ResourceService } from './resource.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('ResourceController & LessonResourceController', () => {
  let resourceController: ResourceController;
  let lessonResourceController: LessonResourceController;
  let mockResourceService: any;

  const mockUserReq: any = {
    user: {
      id: '123',
      role: UserRole.STUDENT,
      fullName: 'Nguyen Van A',
      email: 'a@example.com',
    },
  };

  beforeEach(() => {
    mockResourceService = {
      getPreviewUrl: vi.fn(),
      getDownloadUrl: vi.fn(),
      getLessonResources: vi.fn(),
    };

    resourceController = new ResourceController(
      mockResourceService as unknown as ResourceService,
    );
    lessonResourceController = new LessonResourceController(
      mockResourceService as unknown as ResourceService,
    );
  });

  describe('ResourceController', () => {
    it('báo lỗi BadRequestException khi resourceId không hợp lệ', async () => {
      await expect(
        resourceController.getPreviewUrl(mockUserReq, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        resourceController.getDownloadUrl(mockUserReq, '-5'),
      ).rejects.toThrow(BadRequestException);
    });

    it('gọi getPreviewUrl với id bigint và user context', async () => {
      const mockResult = {
        url: 'https://res.cloudinary.com/test/preview',
        expiresIn: 600,
        mimeType: 'application/pdf',
        fileName: 'tailieu.pdf',
      };
      mockResourceService.getPreviewUrl.mockResolvedValue(mockResult);

      const res = await resourceController.getPreviewUrl(mockUserReq, '456');

      expect(mockResourceService.getPreviewUrl).toHaveBeenCalledWith(
        { id: 123n, role: UserRole.STUDENT },
        456n,
      );
      expect(res).toEqual(mockResult);
    });

    it('gọi getDownloadUrl với id bigint và user context', async () => {
      const mockResult = {
        url: 'https://res.cloudinary.com/test/download',
        expiresIn: 600,
        mimeType: 'application/pdf',
        fileName: 'tailieu.pdf',
      };
      mockResourceService.getDownloadUrl.mockResolvedValue(mockResult);

      const res = await resourceController.getDownloadUrl(mockUserReq, '456');

      expect(mockResourceService.getDownloadUrl).toHaveBeenCalledWith(
        { id: 123n, role: UserRole.STUDENT },
        456n,
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('LessonResourceController', () => {
    it('báo lỗi BadRequestException khi lessonId không hợp lệ', async () => {
      await expect(
        lessonResourceController.getLessonResources(mockUserReq, 'abc'),
      ).rejects.toThrow(BadRequestException);
    });

    it('gọi getLessonResources với id bigint và user context', async () => {
      const mockResources = [
        {
          id: 10n,
          fileName: 'bai-giang.pdf',
          fileSizeBytes: 1024n,
          mimeType: 'application/pdf',
          createdAt: new Date(),
        },
      ];
      mockResourceService.getLessonResources.mockResolvedValue(mockResources);

      const res = await lessonResourceController.getLessonResources(
        mockUserReq,
        '789',
      );

      expect(mockResourceService.getLessonResources).toHaveBeenCalledWith(
        { id: 123n, role: UserRole.STUDENT },
        789n,
      );
      expect(res).toEqual(mockResources);
    });
  });
});

