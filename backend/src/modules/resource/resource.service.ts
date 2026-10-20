import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { extname } from 'node:path';
import {
  UserRole,
  EnrollmentStatus,
  LessonStatus,
  ResourceParent,
} from '../../generated/prisma/enums.js';
import type { Course, Lesson, Resource } from '../../generated/prisma/client.js';

export interface UserContext {
  id: bigint;
  role: UserRole;
}

export interface ResourceUrlResponse {
  url: string;
  expiresIn: number;
  mimeType: string;
  fileName: string;
}

@Injectable()
export class ResourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Helper phân cấp: từ lessonId tìm ngược lại Module và Course
   * `lesson.moduleId -> module.courseId`
   */
  async getCourseByLessonId(lessonId: bigint): Promise<{
    lesson: Lesson;
    course: Course;
  }> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    const course = lesson.module?.course;
    if (!course) {
      throw new NotFoundException('Khóa học chứa bài học không tồn tại');
    }

    return {
      lesson,
      course,
    };
  }

  /**
   * Helper kiểm tra quyền truy cập tài nguyên môn học & bài học:
   * 1. ADMIN: toàn quyền truy cập.
   * 2. TEACHER: phải là chủ sở hữu (ownerId) của môn học.
   * 3. STUDENT:
   *    - Bài học phải ở trạng thái PUBLISHED (bài học DRAFT/ARCHIVED chặn 403).
   *    - Sinh viên phải có Enrollment với trạng thái ACTIVE trong môn học.
   *      (chưa tham gia -> 403; bị gỡ REMOVED -> 403).
   */
  async checkAccess(
    user: UserContext,
    course: Course,
    lesson: Lesson,
  ): Promise<void> {
    // 1. Quản trị viên
    if (user.role === UserRole.ADMIN) {
      return;
    }

    // 2. Giáo viên
    if (user.role === UserRole.TEACHER) {
      if (course.ownerId !== user.id) {
        throw new ForbiddenException(
          'Bạn không phải là giáo viên phụ trách khóa học này',
        );
      }
      return;
    }

    // 3. Sinh viên
    if (user.role === UserRole.STUDENT) {
      // Visibility theo trạng thái lesson: student chỉ thấy resource của lesson PUBLISHED
      if (lesson.status !== LessonStatus.PUBLISHED) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập tài liệu của bài học chưa được công bố',
        );
      }

      // Kiểm tra tư cách enrollment
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          uk_enrollments_course_student: {
            courseId: course.id,
            studentId: user.id,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException('Bạn chưa tham gia khóa học này');
      }

      if (enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('Bạn đã bị gỡ khỏi khóa học này');
      }

      return;
    }

    throw new ForbiddenException('Bạn không có quyền truy cập vào tài nguyên này');
  }

  /**
   * Lấy danh sách tài liệu của một bài học (đã lọc theo quyền)
   */
  async getLessonResources(user: UserContext, lessonId: bigint) {
    const { lesson, course } = await this.getCourseByLessonId(lessonId);

    // Kiểm tra quyền truy cập vào bài học
    await this.checkAccess(user, course, lesson);

    // Lấy danh sách tài nguyên
    const resources = await this.prisma.resource.findMany({
      where: {
        lessonId: lesson.id,
        parentType: ResourceParent.LESSON,
      },
      select: {
        id: true,
        parentType: true,
        lessonId: true,
        uploadedBy: true,
        fileName: true,
        fileSizeBytes: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return resources;
  }

  /**
   * Tìm tài liệu và kiểm tra quyền truy cập theo loại cha:
   *  - LESSON: theo quy tắc bài học (checkAccess)
   *  - SUBMISSION (tệp bài nộp): admin, giáo viên phụ trách khóa học, hoặc chính sinh viên đã nộp
   *    (vẫn phải còn Enrollment ACTIVE)
   */
  async resolveAccessibleResource(
    user: UserContext,
    resourceId: bigint,
  ): Promise<Resource> {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        lesson: { include: { module: { include: { course: true } } } },
        submission: {
          select: {
            studentId: true,
            assignment: { select: { course: true } },
          },
        },
      },
    });
    if (!resource) throw new NotFoundException('Tài liệu không tồn tại');

    if (resource.parentType === ResourceParent.SUBMISSION) {
      const course = resource.submission?.assignment.course;
      if (!resource.submission || !course) {
        throw new NotFoundException('Bài nộp chứa tệp không tồn tại');
      }
      if (user.role === UserRole.ADMIN) return resource;
      if (user.role === UserRole.TEACHER) {
        if (course.ownerId !== user.id) {
          throw new ForbiddenException('Bạn không phải là giáo viên phụ trách khóa học này');
        }
        return resource;
      }
      if (user.role === UserRole.STUDENT && resource.submission.studentId === user.id) {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: { uk_enrollments_course_student: { courseId: course.id, studentId: user.id } },
          select: { status: true },
        });
        if (enrollment?.status !== EnrollmentStatus.ACTIVE) {
          throw new ForbiddenException('Bạn đã bị gỡ khỏi khóa học này');
        }
        return resource;
      }
      throw new ForbiddenException('Bạn không có quyền truy cập tệp bài nộp này');
    }

    const lesson = resource.lesson;
    const course = lesson?.module?.course;
    if (!lesson) throw new NotFoundException('Tài liệu không tồn tại');
    if (!course) throw new NotFoundException('Khóa học chứa tài liệu không tồn tại');
    await this.checkAccess(user, course, lesson);
    return resource;
  }

  /**
   * Lấy signed URL xem tài liệu trực tiếp (preview) — thời hạn 10 phút, không proxy bytes qua server.
   */
  async getPreviewUrl(
    user: UserContext,
    resourceId: bigint,
  ): Promise<ResourceUrlResponse> {
    const resource = await this.resolveAccessibleResource(user, resourceId);

    // Ký URL Cloudinary authenticated
    const signed = this.cloudinaryService.generateSignedUrl(
      resource.storageKey,
      { isDownload: false, expiresInSeconds: 600, format: extname(resource.fileName).slice(1) },
    );

    return {
      url: signed.url,
      expiresIn: signed.expiresIn,
      mimeType: resource.mimeType,
      fileName: resource.fileName,
    };
  }

  /**
   * Lấy signed URL tải tài liệu (download) có flag fl_attachment — thời hạn 10 phút.
   */
  async getDownloadUrl(
    user: UserContext,
    resourceId: bigint,
  ): Promise<ResourceUrlResponse> {
    const resource = await this.resolveAccessibleResource(user, resourceId);

    // Ký URL Cloudinary authenticated kèm fl_attachment
    const signed = this.cloudinaryService.generateSignedUrl(
      resource.storageKey,
      { isDownload: true, expiresInSeconds: 600, format: extname(resource.fileName).slice(1) },
    );

    return {
      url: signed.url,
      expiresIn: signed.expiresIn,
      mimeType: resource.mimeType,
      fileName: resource.fileName,
    };
  }
}
