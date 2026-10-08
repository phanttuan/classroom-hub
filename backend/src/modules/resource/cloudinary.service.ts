import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface GenerateSignedUrlOptions {
  isDownload?: boolean;
  expiresInSeconds?: number;
  /** Đuôi tệp (không dấu chấm) — bắt buộc với image / video vì public_id không chứa đuôi */
  format?: string;
}

export interface SignedUrlResult {
  url: string;
  expiresIn: number;
  expiresAt: number;
}

export type CloudinaryResourceType = 'image' | 'video' | 'raw';

export interface UploadBufferOptions {
  /** public_id đầy đủ (gồm thư mục). Với raw phải kèm phần mở rộng */
  publicId: string;
  resourceType: CloudinaryResourceType;
  /** authenticated: tài liệu riêng tư, chỉ truy cập qua signed URL; upload: công khai (ảnh trong nội dung) */
  deliveryType: 'authenticated' | 'upload';
}

export interface UploadResult {
  /** `<resource_type>:<public_id>` — quy ước lưu trong Resource.storageKey */
  storageKey: string;
  secureUrl: string;
  bytes: number;
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

  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.configured = Boolean(
      this.configService.get<string>('CLOUDINARY_CLOUD_NAME') &&
        this.configService.get<string>('CLOUDINARY_API_KEY') &&
        this.configService.get<string>('CLOUDINARY_API_SECRET'),
    );
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
   * Ký URL tải tài liệu `authenticated` có thời hạn (mặc định 10 phút) qua Download API của Cloudinary.
   * Không proxy byte qua server, trình duyệt tải thẳng từ Cloudinary.
   *
   * Dùng private_download_url thay vì delivery URL kèm auth_token: auth_token (token-based authentication)
   * chỉ có ở gói trả phí, gói Free luôn trả 401. Download API hoạt động ở mọi gói và hỗ trợ expires_at.
   * isDownload = true → Content-Disposition: attachment (tải về), ngược lại inline (xem trực tiếp).
   */
  generateSignedUrl(
    storageKey: string,
    options: GenerateSignedUrlOptions = {},
  ): SignedUrlResult {
    const { resourceType, publicId } = this.parseStorageKey(storageKey);
    const expiresIn = options.expiresInSeconds ?? 600;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    const url = cloudinary.utils.private_download_url(
      publicId,
      resourceType === 'raw' ? '' : (options.format ?? ''),
      {
        resource_type: resourceType,
        type: 'authenticated',
        expires_at: expiresAt,
        attachment: options.isDownload ?? false,
      },
    );

    return {
      url,
      expiresIn,
      expiresAt,
    };
  }

  /** Đã điền đủ CLOUDINARY_* trong .env hay đang dùng giá trị giả lập */
  isConfigured(): boolean {
    return this.configured;
  }

  private assertConfigured() {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong .env)',
      );
    }
  }

  /**
   * Chọn resource_type theo MIME, đồng bộ với quy ước hiện có (PDF / tài liệu văn phòng → raw).
   * SVG để raw để Cloudinary không phục vụ như ảnh (tránh XSS qua SVG).
   */
  static resolveResourceType(mimeType: string): CloudinaryResourceType {
    if (mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') return 'image';
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
    return 'raw';
  }

  /** Upload buffer (multer memory storage) lên Cloudinary */
  async uploadBuffer(buffer: Buffer, options: UploadBufferOptions): Promise<UploadResult> {
    this.assertConfigured();

    const result = await new Promise<{ public_id: string; secure_url: string; bytes: number }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: options.publicId,
            resource_type: options.resourceType,
            type: options.deliveryType,
            overwrite: false,
          },
          (error, res) => {
            if (error || !res) return reject(error ?? new Error('Upload Cloudinary thất bại'));
            resolve(res);
          },
        );
        stream.end(buffer);
      },
    );

    return {
      storageKey: `${options.resourceType}:${result.public_id}`,
      secureUrl: result.secure_url,
      bytes: result.bytes,
    };
  }

  /** Xóa file theo storageKey. Lỗi chỉ ghi log (không chặn việc xóa dữ liệu trong DB) */
  async destroy(storageKey: string): Promise<void> {
    if (!this.configured || !storageKey) return;
    const { resourceType, publicId } = this.parseStorageKey(storageKey);
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: 'authenticated',
        invalidate: true,
      });
    } catch (error) {
      this.logger.warn(`Không xóa được file Cloudinary ${storageKey}: ${(error as Error).message}`);
    }
  }

  async destroyMany(storageKeys: string[]): Promise<void> {
    await Promise.all(storageKeys.map((key) => this.destroy(key)));
  }
}

