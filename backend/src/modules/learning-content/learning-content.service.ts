import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { UserRole, LessonStatus, LessonType, EnrollmentStatus, CourseStatus } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CloudinaryService } from '../resource/cloudinary.service.js';
import { buildLessonFields } from './utils/lesson-fields.js';
import { difference, extractContentImageIds } from './utils/content-images.js';
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { DEFAULT_MODULE_TITLE } from './learning-content.constants.js';

/**
 * Quản lý nội dung học tập theo mô hình Course (Môn học) → Module → Lesson.
 * Việc tạo / sửa / đổi trạng thái Course do CourseModule đảm nhiệm.
 */
@Injectable()
export class LearningContentService {
  private readonly logger = new Logger(LearningContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // =========================================================================
  // HELPER PERMISSION CHECKS
  // =========================================================================

  private async verifyCourseTeacherAccess(courseId: bigint, userId: bigint, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { ownerId: true, status: true },
    });
    if (!course) {
      throw new NotFoundException('Lớp học không tồn tại');
    }
    if (course.ownerId !== userId) {
      throw new ForbiddenException('Bạn không phải giáo viên phụ trách lớp học này');
    }
    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('Lớp học đã lưu trữ (chỉ đọc), không thể chỉnh sửa nội dung');
    }
  }

  /**
   * Xóa trên Cloudinary các ảnh nội dung không còn bài nào dùng.
   * Gọi SAU khi đã lưu / xóa trong DB; kiểm tra lại toàn bộ bài vì cùng một ảnh có thể được dán sang bài khác.
   */
  private async cleanupContentImages(candidates: Iterable<string>) {
    const ids = [...candidates];
    if (!ids.length) return;
    const usage = await Promise.all(
      ids.map((id) =>
        this.prisma.lesson.count({
          where: { OR: [{ content: { contains: id } }, { description: { contains: id } }] },
        }),
      ),
    );
    await this.cloudinary.destroyContentImages(ids.filter((_, i) => usage[i] === 0));
  }

  /** Lấy storageKey các tệp đính kèm để dọn trên Cloudinary sau khi xóa trong DB */
  private async collectStorageKeys(where: Prisma.ResourceWhereInput) {
    const resources = await this.prisma.resource.findMany({ where, select: { storageKey: true } });
    return resources.map((r) => r.storageKey);
  }

  private async verifyCourseMemberOrTeacherAccess(courseId: bigint, userId: bigint, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { ownerId: true },
    });
    if (!course) {
      throw new NotFoundException('Lớp học không tồn tại');
    }
    if (role === UserRole.TEACHER) {
      if (course.ownerId !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập lớp học này');
      }
      return;
    }
    // Student
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        uk_enrollments_course_student: {
          courseId,
          studentId: userId,
        },
      },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('Bạn không phải thành viên hoạt động của lớp học này');
    }
  }

  // =========================================================================
  // 0. TIẾN ĐỘ TỔNG HỢP CÁC LỚP CỦA SINH VIÊN
  // =========================================================================

  /**
   * Tiến độ của mọi lớp sinh viên đang học (ghi danh ACTIVE) — dùng cho trang "Lớp học" của sinh viên.
   * Cố định 3 truy vấn bất kể số lớp (thay cho gọi /courses/:id/content từng lớp — N+1).
   * Chỉ tính bài đã công bố và không phải "Văn bản và phương tiện" (khớp getCourseContent).
   */
  async getMyCourseProgress(studentId: bigint) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
      orderBy: { joinedAt: 'desc' },
      select: {
        course: {
          select: {
            id: true,
            courseCode: true,
            name: true,
            description: true,
            status: true,
            updatedAt: true,
            owner: { select: { id: true, fullName: true, avatarUrl: true } },
            _count: { select: { modules: true } },
          },
        },
      },
    });
    const courses = enrollments.map((e) => e.course);
    if (!courses.length) return [];

    const courseIds = courses.map((c) => c.id);
    const trackableLesson = {
      status: LessonStatus.PUBLISHED,
      type: { not: LessonType.LABEL },
      module: { courseId: { in: courseIds } },
    } satisfies Prisma.LessonWhereInput;

    const [lessons, completed] = await Promise.all([
      this.prisma.lesson.findMany({
        where: trackableLesson,
        select: { module: { select: { courseId: true } } },
      }),
      this.prisma.lessonProgress.findMany({
        where: { studentId, isCompleted: true, lesson: trackableLesson },
        select: { lesson: { select: { module: { select: { courseId: true } } } } },
      }),
    ]);

    const countBy = (ids: bigint[]) => {
      const map = new Map<bigint, number>();
      for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1);
      return map;
    };
    const totals = countBy(lessons.map((l) => l.module.courseId));
    const done = countBy(completed.map((p) => p.lesson.module.courseId));

    return courses.map(({ _count, ...course }) => {
      const totalLessons = totals.get(course.id) ?? 0;
      const completedLessons = done.get(course.id) ?? 0;
      return {
        ...course,
        moduleCount: _count.modules,
        totalLessons,
        completedLessons,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    });
  }

  // =========================================================================
  // 1. COURSE CONTENT API (Môn học kèm Module / Lesson / tiến độ)
  // =========================================================================

  async getCourseContent(userId: bigint, role: UserRole, courseId: bigint) {
    await this.verifyCourseMemberOrTeacherAccess(courseId, userId, role);

    const isStudent = role === UserRole.STUDENT;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        ownerId: true,
        courseCode: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              where: isStudent ? { status: LessonStatus.PUBLISHED } : undefined,
              orderBy: { orderIndex: 'asc' },
              include: isStudent
                ? {
                    progresses: {
                      where: { studentId: userId },
                    },
                    resources: true,
                  }
                : {
                    resources: true,
                  },
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Lớp học không tồn tại');

    let totalPublished = 0;
    let completedCount = 0;

    const formattedModules = course.modules.map((m) => {
      const formattedLessons = m.lessons.map((l) => {
        const { progresses, ...lesson } = l as typeof l & {
          progresses?: { isCompleted: boolean; completedAt: Date | null }[];
        };
        const progress = progresses?.[0];
        const isCompleted = progress?.isCompleted ?? false;
        // "Văn bản và phương tiện" chỉ hiển thị trên trang lớp, không có hoàn thành → không tính vào tiến độ
        if (l.type !== LessonType.LABEL) {
          totalPublished++;
          if (isCompleted) completedCount++;
        }

        return {
          ...lesson,
          isCompleted,
          completedAt: progress?.completedAt ?? null,
        };
      });

      return {
        ...m,
        lessons: formattedLessons,
        lessonCount: formattedLessons.length,
      };
    });

    const progressPercent =
      totalPublished > 0 ? Math.round((completedCount / totalPublished) * 100) : 0;

    return {
      ...course,
      modules: formattedModules,
      moduleCount: formattedModules.length,
      totalLessons: totalPublished,
      completedLessons: completedCount,
      progressPercent,
    };
  }

  // =========================================================================
  // 2. MODULE APIS
  // =========================================================================

  async createModule(userId: bigint, role: UserRole, courseId: bigint, dto: CreateModuleDto) {
    await this.verifyCourseTeacherAccess(courseId, userId, role);

    const maxOrder = await this.prisma.module.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const nextOrder = (maxOrder?.orderIndex ?? 0) + 1;

    return this.prisma.module.create({
      data: {
        courseId,
        title: dto.title.trim(),
        orderIndex: nextOrder,
      },
      include: {
        lessons: true,
      },
    });
  }

  async updateModule(userId: bigint, role: UserRole, moduleId: bigint, dto: UpdateModuleDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true, isDefault: true },
    });
    if (!module) throw new NotFoundException('Topic không tồn tại');

    await this.verifyCourseTeacherAccess(module.courseId, userId, role);

    if (module.isDefault) {
      throw new BadRequestException(`Không thể đổi tên topic mặc định "${DEFAULT_MODULE_TITLE}"`);
    }

    return this.prisma.module.update({
      where: { id: moduleId },
      data: {
        title: dto.title.trim(),
      },
    });
  }

  async deleteModule(userId: bigint, role: UserRole, moduleId: bigint) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true, isDefault: true },
    });
    if (!module) throw new NotFoundException('Topic không tồn tại');

    await this.verifyCourseTeacherAccess(module.courseId, userId, role);

    if (module.isDefault) {
      throw new BadRequestException(`Không thể xóa topic mặc định "${DEFAULT_MODULE_TITLE}"`);
    }

    const storageKeys = await this.collectStorageKeys({ lesson: { moduleId } });
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      select: { content: true, description: true },
    });
    const imageIds = extractContentImageIds(...lessons.flatMap((l) => [l.content, l.description]));
    await this.prisma.module.delete({
      where: { id: moduleId },
    });
    await this.cloudinary.destroyMany(storageKeys);
    await this.cleanupContentImages(imageIds);

    return { message: 'Đã xóa topic thành công' };
  }

  async reorderModules(userId: bigint, role: UserRole, courseId: bigint, moduleIds: (string | number)[]) {
    await this.verifyCourseTeacherAccess(courseId, userId, role);

    // Module mặc định luôn đứng đầu, bất kể thứ tự client gửi lên
    const defaultModule = await this.prisma.module.findFirst({
      where: { courseId, isDefault: true },
      select: { id: true },
    });
    let parsedIds = moduleIds.map((id) => BigInt(id));
    if (defaultModule) {
      parsedIds = [defaultModule.id, ...parsedIds.filter((id) => id !== defaultModule.id)];
    }
    const ownedCount = await this.prisma.module.count({
      where: { id: { in: parsedIds }, courseId },
    });
    if (ownedCount !== parsedIds.length) {
      throw new BadRequestException('Danh sách topic không hợp lệ hoặc không thuộc lớp học này');
    }

    await this.prisma.$transaction(async (tx) => {
      // Bước 1: chuyển tạm sang âm
      for (let i = 0; i < parsedIds.length; i++) {
        await tx.module.update({
          where: { id: parsedIds[i] },
          data: { orderIndex: -(i + 1) },
        });
      }
      // Bước 2: gán vị trí mới dương (1-based)
      for (let i = 0; i < parsedIds.length; i++) {
        await tx.module.update({
          where: { id: parsedIds[i] },
          data: { orderIndex: i + 1 },
        });
      }
    });

    return { message: 'Đã cập nhật thứ tự topic thành công' };
  }

  // =========================================================================
  // 3. LESSON APIS
  // =========================================================================

  async createLesson(userId: bigint, role: UserRole, moduleId: bigint, dto: CreateLessonDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!module) throw new NotFoundException('Topic không tồn tại');

    await this.verifyCourseTeacherAccess(module.courseId, userId, role);

    const maxOrder = await this.prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const nextOrder = (maxOrder?.orderIndex ?? 0) + 1;
    const initialStatus = dto.status ?? LessonStatus.DRAFT;
    const fields = buildLessonFields(dto.type, dto);

    return this.prisma.lesson.create({
      data: {
        moduleId,
        type: dto.type,
        ...fields,
        settings: fields.settings as Prisma.InputJsonValue,
        status: initialStatus,
        publishedAt: initialStatus === LessonStatus.PUBLISHED ? new Date() : null,
        orderIndex: nextOrder,
      },
      include: { resources: true },
    });
  }

  async getLessonDetail(userId: bigint, role: UserRole, lessonId: bigint) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: { courseId: true },
        },
        resources: true,
      },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    await this.verifyCourseMemberOrTeacherAccess(lesson.module.courseId, userId, role);

    if (role === UserRole.STUDENT) {
      if (lesson.status !== LessonStatus.PUBLISHED) {
        throw new ForbiddenException('Bài học này chưa được xuất bản');
      }

      const progress = await this.prisma.lessonProgress.findUnique({
        where: {
          uk_lesson_progress_lesson_student: {
            lessonId,
            studentId: userId,
          },
        },
      });

      return {
        ...lesson,
        isCompleted: progress?.isCompleted ?? false,
        completedAt: progress?.completedAt ?? null,
      };
    }

    return lesson;
  }

  async updateLesson(userId: bigint, role: UserRole, lessonId: bigint, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    await this.verifyCourseTeacherAccess(lesson.module.courseId, userId, role);

    // Gộp giá trị cũ với giá trị mới rồi kiểm tra lại theo loại bài
    const fields = buildLessonFields(lesson.type, {
      title: dto.title ?? lesson.title,
      description: dto.description ?? lesson.description,
      content: dto.content ?? lesson.content,
      externalUrl: dto.externalUrl ?? lesson.externalUrl,
      settings: { ...(lesson.settings as Record<string, unknown> | null), ...dto.settings },
    });

    const updateData: Prisma.LessonUpdateInput = {
      ...fields,
      settings: fields.settings as Prisma.InputJsonValue,
    };
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === LessonStatus.PUBLISHED && lesson.status !== LessonStatus.PUBLISHED) {
        updateData.publishedAt = new Date();
      }
    }

    const updated = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
      include: { resources: true },
    });

    // Ảnh bị gỡ khỏi nội dung / mô tả → dọn trên Cloudinary nếu không bài nào khác còn dùng
    await this.cleanupContentImages(
      difference(
        extractContentImageIds(lesson.content, lesson.description),
        extractContentImageIds(updated.content, updated.description),
      ),
    );
    return updated;
  }

  async deleteLesson(userId: bigint, role: UserRole, lessonId: bigint) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    await this.verifyCourseTeacherAccess(lesson.module.courseId, userId, role);

    const storageKeys = await this.collectStorageKeys({ lessonId });
    const imageIds = extractContentImageIds(lesson.content, lesson.description);
    await this.prisma.lesson.delete({
      where: { id: lessonId },
    });
    await this.cloudinary.destroyMany(storageKeys);
    await this.cleanupContentImages(imageIds);

    return { message: 'Đã xóa bài học thành công' };
  }

  async reorderLessons(userId: bigint, role: UserRole, moduleId: bigint, lessonIds: (string | number)[]) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!module) throw new NotFoundException('Topic không tồn tại');

    await this.verifyCourseTeacherAccess(module.courseId, userId, role);

    const parsedIds = lessonIds.map((id) => BigInt(id));
    const ownedCount = await this.prisma.lesson.count({
      where: { id: { in: parsedIds }, moduleId },
    });
    if (ownedCount !== parsedIds.length) {
      throw new BadRequestException('Danh sách bài học không hợp lệ hoặc không thuộc topic này');
    }

    await this.prisma.$transaction(async (tx) => {
      // Bước 1: chuyển tạm sang âm
      for (let i = 0; i < parsedIds.length; i++) {
        await tx.lesson.update({
          where: { id: parsedIds[i] },
          data: { orderIndex: -(i + 1) },
        });
      }
      // Bước 2: gán vị trí mới dương (1-based)
      for (let i = 0; i < parsedIds.length; i++) {
        await tx.lesson.update({
          where: { id: parsedIds[i] },
          data: { orderIndex: i + 1 },
        });
      }
    });

    return { message: 'Đã cập nhật thứ tự bài học thành công' };
  }

  // =========================================================================
  // 4. PROGRESS APIS (STUDENT)
  // =========================================================================

  async toggleLessonProgress(studentId: bigint, lessonId: bigint, forcedState?: boolean) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    if (lesson.status !== LessonStatus.PUBLISHED) {
      throw new ForbiddenException('Chỉ có thể đánh dấu bài học đã xuất bản');
    }
    if (lesson.type === LessonType.LABEL) {
      throw new BadRequestException('Văn bản và phương tiện không có trạng thái hoàn thành');
    }

    await this.verifyCourseMemberOrTeacherAccess(lesson.module.courseId, studentId, UserRole.STUDENT);

    const existing = await this.prisma.lessonProgress.findUnique({
      where: {
        uk_lesson_progress_lesson_student: {
          lessonId,
          studentId,
        },
      },
    });

    const targetState = forcedState !== undefined ? forcedState : !(existing?.isCompleted ?? false);

    const record = await this.prisma.lessonProgress.upsert({
      where: {
        uk_lesson_progress_lesson_student: {
          lessonId,
          studentId,
        },
      },
      create: {
        lessonId,
        studentId,
        isCompleted: targetState,
        completedAt: targetState ? new Date() : null,
      },
      update: {
        isCompleted: targetState,
        completedAt: targetState ? new Date() : null,
      },
    });

    return {
      lessonId: lessonId.toString(),
      isCompleted: record.isCompleted,
      completedAt: record.completedAt,
    };
  }
}
