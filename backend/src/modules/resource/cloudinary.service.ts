import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface GenerateSignedUrlOptions {
  isDownload?: boolean;
  expiresInSeconds?: number;
}

export interface SignedUrlResult {
  url: string;
  expiresIn: number;
  expiresAt: number;
}

export interface ParsedStorageKey {
  resourceType: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.cloudName =
      this.configService.get<string>('CLOUDINARY_CLOUD_NAME') ||
      'classroom-hub-dev';
    this.apiKey =
      this.configService.get<string>('CLOUDINARY_API_KEY') || '123456789012345';
    this.apiSecret =
      this.configService.get<string>('CLOUDINARY_API_SECRET') ||
      'dev_secret_key_classroom_hub_2026';

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  /**
   * Phân tích storageKey dạng `<resource_type>:<public_id>`
   * Mặc định resource_type là 'raw' nếu không có tiền tố.
   */
  parseStorageKey(storageKey: string): ParsedStorageKey {
    if (!storageKey) {
      return { resourceType: 'raw', publicId: '' };
    }

    const colonIndex = storageKey.indexOf(':');
    if (colonIndex === -1) {
      return {
        resourceType: 'raw',
        publicId: storageKey,
      };
    }

    const resourceType = storageKey.substring(0, colonIndex).trim() || 'raw';
    const publicId = storageKey.substring(colonIndex + 1).trim();

    return { resourceType, publicId };
  }

  /**
   * Ký signed URL Cloudinary với delivery type authenticated và thời hạn 10 phút (600 giây).
   * Không proxy byte qua server, trình duyệt truy cập thẳng qua CDN Cloudinary.
   */
  generateSignedUrl(
    storageKey: string,
    options: GenerateSignedUrlOptions = {},
  ): SignedUrlResult {
    const { resourceType, publicId } = this.parseStorageKey(storageKey);
    const expiresIn = options.expiresInSeconds ?? 600;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + expiresIn;

    const urlOptions: Record<string, any> = {
      resource_type: resourceType,
      type: 'authenticated',
      sign_url: true,
      auth_token: {
        key: this.apiSecret,
        duration: expiresIn,
        start_time: now,
      },
    };

    if (options.isDownload) {
      urlOptions.flags = 'attachment';
    }

    let url = cloudinary.url(publicId, urlOptions);

    // Đảm bảo URL có tham số expires_at để tiện kiểm tra và verify hạn dùng
    if (!url.includes('expires_at=')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}expires_at=${expiresAt}`;
    }

    return {
      url,
      expiresIn,
      expiresAt,
    };
  }
}

