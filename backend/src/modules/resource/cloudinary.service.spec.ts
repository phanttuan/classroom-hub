import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service.js';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: (key: string) => {
        if (key === 'CLOUDINARY_CLOUD_NAME') return 'test-cloud';
        if (key === 'CLOUDINARY_API_KEY') return 'test-api-key';
        if (key === 'CLOUDINARY_API_SECRET') return 'test-secret';
        return undefined;
      },
    };

    service = new CloudinaryService(mockConfigService as ConfigService);
  });

  describe('parseStorageKey', () => {
    it('phân tích đúng tiền tố raw', () => {
      const res = service.parseStorageKey(
        'raw:classroom-hub/lessons/abc123/de-cuong.pdf',
      );
      expect(res.resourceType).toBe('raw');
      expect(res.publicId).toBe('classroom-hub/lessons/abc123/de-cuong.pdf');
    });

    it('phân tích đúng tiền tố image', () => {
      const res = service.parseStorageKey(
        'image:classroom-hub/lessons/abc123/diagram.png',
      );
      expect(res.resourceType).toBe('image');
      expect(res.publicId).toBe('classroom-hub/lessons/abc123/diagram.png');
    });

    it('phân tích đúng tiền tố video', () => {
      const res = service.parseStorageKey(
        'video:classroom-hub/lessons/abc123/lecture.mp4',
      );
      expect(res.resourceType).toBe('video');
      expect(res.publicId).toBe('classroom-hub/lessons/abc123/lecture.mp4');
    });

    it('mặc định là raw khi không có tiền tố dấu 2 chấm', () => {
      const res = service.parseStorageKey('legacy-file-without-prefix.pdf');
      expect(res.resourceType).toBe('raw');
      expect(res.publicId).toBe('legacy-file-without-prefix.pdf');
    });

    it('xử lý chuỗi rỗng an toàn', () => {
      const res = service.parseStorageKey('');
      expect(res.resourceType).toBe('raw');
      expect(res.publicId).toBe('');
    });
  });

  describe('generateSignedUrl', () => {
    it('ký URL xem trực tiếp (preview) với delivery type authenticated và thời hạn 10 phút', () => {
      const beforeNow = Math.floor(Date.now() / 1000);
      const result = service.generateSignedUrl(
        'raw:classroom-hub/lessons/abc123/de-cuong.pdf',
        { isDownload: false },
      );
      const afterNow = Math.floor(Date.now() / 1000);

      expect(result.expiresIn).toBe(600);
      expect(result.expiresAt).toBeGreaterThanOrEqual(beforeNow + 600);
      expect(result.expiresAt).toBeLessThanOrEqual(afterNow + 600);

      // Download API của Cloudinary (chạy được ở gói Free), type authenticated
      expect(result.url).toContain('https://api.cloudinary.com/v1_1/test-cloud/raw/download?');
      expect(result.url).toContain(encodeURIComponent('classroom-hub/lessons/abc123/de-cuong.pdf'));
      // Xem trực tiếp: không có cờ attachment
      expect(result.url).not.toContain('attachment=true');
      // Có tham số expires_at hoặc exp token
      expect(result.url).toMatch(/(?:exp|expires_at)=(\d+)/);
    });

    it('ký URL tải xuống (download) có cờ attachment để trình duyệt tải file về', () => {
      const result = service.generateSignedUrl(
        'raw:classroom-hub/lessons/abc123/de-cuong.pdf',
        { isDownload: true },
      );

      expect(result.expiresIn).toBe(600);
      expect(result.url).toContain('attachment=true');
      expect(result.url).toContain('authenticated');
      expect(result.url).toMatch(/(?:exp|expires_at)=(\d+)/);
    });

    it('cho phép tùy biến thời gian hết hạn nếu cần', () => {
      const result = service.generateSignedUrl(
        'image:classroom-hub/lessons/abc123/photo.jpg',
        { expiresInSeconds: 300 },
      );

      expect(result.expiresIn).toBe(300);
      expect(result.url).toContain('/image/download?');
    });
  });
});

