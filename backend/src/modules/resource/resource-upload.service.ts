/// <reference types="multer" />
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { PrismaService } from '../../database/prisma.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import {
  CourseStatus,
  LessonType,
  ResourceParent,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { UserContext } from './resource.service.js';

/** Đuôi tệp bị chặn (thực thi được / chạy script khi mở trên trình duyệt) */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1', '.vbs', '.sh', '.jar', '.apk',
  '.js', '.mjs', '.html', '.htm', '.xhtml', '.svg', '.php',
]);

const CONTENT_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const CONTENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_FOLDER = 50;

/** Giới hạn cứng cho multer (giới hạn thật lấy từ UPLOAD_MAX_FILE_MB) */
export const MULTER_HARD_LIMIT_BYTES = 100 * 1024 * 1024;

/**
 * Multer giải mã originalname theo latin1 → tên tiếng Việt bị lỗi font.
 * Chuyển lại sang UTF-8.
 */
export function decodeOriginalName(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

/** "Bài giảng Chương 1.pdf" → "bai-giang-chuong-1" */
function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'file'
  );
}

/**
 * Upload / xóa tài liệu của bài học lên Cloudinary.
 * Quy ước đồng bộ với ResourceService:
 *  - storageKey = `<resource_type>:<public_id>`
 *  - Tài liệu bài học: delivery type `authenticated`, chỉ xem qua signed URL có hạn
 *  - public_id: `classroom-hub/lessons/<courseId>/<lessonId>/<thời gian>-<ngẫu nhiên>-<tên>` (raw kèm đuôi tệp)
 *  - Ảnh chèn trong nội dung (Page / Label): công khai, `classroom-hub/content-images/<courseId>/...`
 */
@Injectable()
export class ResourceUploadService {
  private readonly maxFileBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    configService: ConfigService,
  ) {
    const mb = Number(configService.get<string>('UPLOAD_MAX_FILE_MB')) || 20;
    this.maxFileBytes = Math.min(mb * 1024 * 1024, MULTER_HARD_LIMIT_BYTES);
  }

  private assertCanManageCourse(
    user: UserContext,
    course: { ownerId: bigint; status: CourseStatus },
  ) {
    if (user.role !== UserRole.ADMIN && !(user.role === UserRole.TEACHER && course.ownerId === user.id)) {
      throw new ForbiddenException('Bạn không phải giáo viên phụ trách lớp học này');
    }
    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('Lớp học đã lưu trữ (chỉ đọc), không thể thay đổi tài liệu');
    }
  }

  private validateFile(file: Express.Multer.File, fileName: string) {
    if (!file.size) throw new BadRequestException(`Tệp "${fileName}" rỗng`);
    if (file.size > this.maxFileBytes) {
      throw new PayloadTooLargeException(
        `Tệp "${fileName}" vượt quá dung lượng cho phép (${Math.round(this.maxFileBytes / 1024 / 1024)}MB)`,
      );
    }
    if (BLOCKED_EXTENSIONS.has(extname(fileName).toLowerCase())) {
      throw new BadRequestException(`Không cho phép tải lên loại tệp "${extname(fileName)}"`);
    }
  }

  private buildPublicId(folder: string, fileName: string, keepExtension: boolean) {
    const ext = extname(fileName).toLowerCase();
    const base = slugify(ext ? fileName.slice(0, -ext.length) : fileName);
    const unique = `${Date.now()}-${randomBytes(3).toString('hex')}`;
    return `${folder}/${unique}-${base}${keepExtension ? ext : ''}`;
  }

  /**
   * Tải tệp lên bài học FILE (1 tệp — tệp mới thay thế tệp cũ) hoặc FOLDER (nhiều tệp).
   */
  async uploadLessonFiles(user: UserContext, lessonId: bigint, files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Chưa chọn tệp nào');

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        type: true,
        module: { select: { course: { select: { id: true, ownerId: true, status: true } } } },
        _count: { select: { resources: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    const course = lesson.module.course;
    this.assertCanManageCourse(user, course);

    if (lesson.type !== LessonType.FILE && lesson.type !== LessonType.FOLDER) {
      throw new BadRequestException('Chỉ tài nguyên Tệp hoặc Thư mục mới có tệp đính kèm');
    }
    if (lesson.type === LessonType.FILE && files.length > 1) {
      throw new BadRequestException('Tài nguyên Tệp chỉ chứa 1 tệp');
    }
    if (lesson.type === LessonType.FOLDER && lesson._count.resources + files.length > MAX_FILES_PER_FOLDER) {
      throw new BadRequestException(`Thư mục chứa tối đa ${MAX_FILES_PER_FOLDER} tệp`);
    }

    const named = files.map((file) => ({ file, fileName: decodeOriginalName(file.originalname) }));
    named.forEach(({ file, fileName }) => this.validateFile(file, fileName));

    const previous =
      lesson.type === LessonType.FILE
        ? await this.prisma.resource.findMany({
            where: { lessonId, parentType: ResourceParent.LESSON },
            select: { id: true, storageKey: true },
          })
        : [];

    const folder = `classroom-hub/lessons/${course.id}/${lesson.id}`;
    const uploaded: { storageKey: string; fileName: string; size: number; mimeType: string }[] = [];
    try {
      for (const { file, fileName } of named) {
        const resourceType = CloudinaryService.resolveResourceType(file.mimetype);
        const result = await this.cloudinary.uploadBuffer(file.buffer, {
          publicId: this.buildPublicId(folder, fileName, resourceType === 'raw'),
          resourceType,
          deliveryType: 'authenticated',
        });
        uploaded.push({
          storageKey: result.storageKey,
          fileName,
          size: file.size,
          mimeType: file.mimetype || 'application/octet-stream',
        });
      }
    } catch (error) {
      // Upload dở dang → dọn các tệp đã lên Cloudinary
      await this.cloudinary.destroyMany(uploaded.map((u) => u.storageKey));
      throw error;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (previous.length) {
        await tx.resource.deleteMany({ where: { id: { in: previous.map((r) => r.id) } } });
      }
      return Promise.all(
        uploaded.map((u) =>
          tx.resource.create({
            data: {
              parentType: ResourceParent.LESSON,
              lessonId,
              uploadedBy: user.id,
              fileName: u.fileName,
              storageKey: u.storageKey,
              fileSizeBytes: BigInt(u.size),
              mimeType: u.mimeType,
            },
            select: {
              id: true,
              parentType: true,
              lessonId: true,
              fileName: true,
              fileSizeBytes: true,
              mimeType: true,
              createdAt: true,
            },
          }),
        ),
      );
    });

    await this.cloudinary.destroyMany(previous.map((r) => r.storageKey));
    return created;
  }

  async deleteResource(user: UserContext, resourceId: bigint) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        storageKey: true,
        parentType: true,
        lesson: {
          select: { module: { select: { course: { select: { ownerId: true, status: true } } } } },
        },
      },
    });
    if (!resource || resource.parentType !== ResourceParent.LESSON || !resource.lesson) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    this.assertCanManageCourse(user, resource.lesson.module.course);

    await this.prisma.resource.delete({ where: { id: resourceId } });
    await this.cloudinary.destroy(resource.storageKey);
    return { message: 'Đã xóa tài liệu' };
  }

  /** Ảnh chèn trong trình soạn thảo — công khai để nhúng trực tiếp vào HTML */
  async uploadContentImage(user: UserContext, courseId: bigint, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn ảnh');

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { ownerId: true, status: true },
    });
    if (!course) throw new NotFoundException('Lớp học không tồn tại');
    this.assertCanManageCourse(user, course);

    if (!CONTENT_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Chỉ hỗ trợ ảnh PNG, JPEG, GIF hoặc WEBP');
    }
    if (file.size > CONTENT_IMAGE_MAX_BYTES) {
      throw new PayloadTooLargeException('Ảnh tối đa 5MB');
    }

    const fileName = decodeOriginalName(file.originalname);
    const result = await this.cloudinary.uploadBuffer(file.buffer, {
      publicId: this.buildPublicId(`classroom-hub/content-images/${courseId}`, fileName, false),
      resourceType: 'image',
      deliveryType: 'upload',
    });
    return { url: result.secureUrl };
  }
}
