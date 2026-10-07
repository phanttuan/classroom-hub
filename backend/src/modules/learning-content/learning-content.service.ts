import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { UserRole, LessonStatus, MembershipStatus } from '../../generated/prisma/enums.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';

@Injectable()
export class LearningContentService {
  private readonly logger = new Logger(LearningContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // HELPER PERMISSION CHECKS
  // =========================================================================

  private async verifyClassTeacherAccess(classId: bigint, userId: bigint, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classId },
    });
    if (!classroom) {
      throw new NotFoundException('Lớp học không tồn tại');
    }
    if (classroom.ownerId !== userId) {
      throw new ForbiddenException('Bạn không phải giáo viên quản lý lớp học này');
    }
  }

  private async verifyClassMemberOrTeacherAccess(classId: bigint, userId: bigint, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classId },
    });
    if (!classroom) {
      throw new NotFoundException('Lớp học không tồn tại');
    }
    if (role === UserRole.TEACHER) {
      if (classroom.ownerId !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập lớp học này');
      }
      return;
    }
    // Student
    const membership = await this.prisma.classMembership.findUnique({
      where: {
        uk_class_memberships_class_student: {
          classId,
          studentId: userId,
        },
      },
    });
    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('Bạn không phải thành viên hoạt động của lớp học này');
    }
  }

  // =========================================================================
  // 1. COURSE APIS
  // =========================================================================

  async createCourse(userId: bigint, role: UserRole, classId: bigint, dto: CreateCourseDto) {
    await this.verifyClassTeacherAccess(classId, userId, role);

    const maxOrder = await this.prisma.course.findFirst({
      where: { classId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const nextOrder = (maxOrder?.orderIndex ?? 0) + 1;

    return this.prisma.course.create({
      data: {
        classId,
        title: dto.title.trim(),
        orderIndex: nextOrder,
      },
      include: {
        modules: true,
      },
    });
  }

  async getCoursesByClass(userId: bigint, role: UserRole, classId: bigint) {
    await this.verifyClassMemberOrTeacherAccess(classId, userId, role);

    const isStudent = role === UserRole.STUDENT;

    const courses = await this.prisma.course.findMany({
      where: { classId },
      orderBy: { orderIndex: 'asc' },
      include: {
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

    // Tính toán tiến độ nếu là Student
    return courses.map((course) => {
      let totalPublished = 0;
      let completedCount = 0;

      const formattedModules = course.modules.map((m) => {
        const formattedLessons = m.lessons.map((l) => {
          totalPublished++;
          const progress = (l as any).progresses?.[0];
          const isCompleted = progress?.isCompleted ?? false;
          if (isCompleted) completedCount++;

          return {
            ...l,
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
    });
  }

  async getCourseDetail(userId: bigint, role: UserRole, courseId: bigint) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { classroom: true },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại');
    }

    await this.verifyClassMemberOrTeacherAccess(course.classId, userId, role);

    const isStudent = role === UserRole.STUDENT;

    const fullCourse = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            classCode: true,
            status: true,
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

    if (!fullCourse) throw new NotFoundException('Khóa học không tồn tại');

    let totalPublished = 0;
    let completedCount = 0;

    const formattedModules = fullCourse.modules.map((m) => {
      const formattedLessons = m.lessons.map((l) => {
        totalPublished++;
        const progress = (l as any).progresses?.[0];
        const isCompleted = progress?.isCompleted ?? false;
        if (isCompleted) completedCount++;

        return {
          ...l,
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
      ...fullCourse,
      modules: formattedModules,
      moduleCount: formattedModules.length,
      totalLessons: totalPublished,
      completedLessons: completedCount,
      progressPercent,
    };
  }

  async updateCourse(userId: bigint, role: UserRole, courseId: bigint, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    await this.verifyClassTeacherAccess(course.classId, userId, role);

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        title: dto.title.trim(),
      },
    });
  }

  async deleteCourse(userId: bigint, role: UserRole, courseId: bigint) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    await this.verifyClassTeacherAccess(course.classId, userId, role);

    await this.prisma.course.delete({
      where: { id: courseId },
    });

    return { message: 'Đã xóa khóa học thành công' };
  }

  async reorderCourses(userId: bigint, role: UserRole, classId: bigint, courseIds: (string | number)[]) {
    await this.verifyClassTeacherAccess(classId, userId, role);

    const parsedIds = courseIds.map((id) => BigInt(id));

    // Thực hiện trong transaction tránh vi phạm unique constraint
    await this.prisma.$transaction(async (tx) => {
      // Bước 1: chuyển tạm sang số âm
      for (let i = 0; i < parsedIds.length; i++) {
        await tx.course.update({
          where: { id: parsedIds[i] },
          data: { orderIndex: -(i + 1) },
        });
      }
      // Bước 2: gán vị trí mới dương (1-based)
      for (let i = 0; i < parsedIds.length; i++) {
        await tx.course.update({
          where: { id: parsedIds[i] },
          data: { orderIndex: i + 1 },
        });
      }
    });

    return { message: 'Đã cập nhật thứ tự khóa học thành công' };
  }

  // =========================================================================
  // 2. MODULE APIS
  // =========================================================================

  async createModule(userId: bigint, role: UserRole, courseId: bigint, dto: CreateModuleDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    await this.verifyClassTeacherAccess(course.classId, userId, role);

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
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module không tồn tại');

    await this.verifyClassTeacherAccess(module.course.classId, userId, role);

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
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module không tồn tại');

    await this.verifyClassTeacherAccess(module.course.classId, userId, role);

    await this.prisma.module.delete({
      where: { id: moduleId },
    });

    return { message: 'Đã xóa module thành công' };
  }

  async reorderModules(userId: bigint, role: UserRole, courseId: bigint, moduleIds: (string | number)[]) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    await this.verifyClassTeacherAccess(course.classId, userId, role);

    const parsedIds = moduleIds.map((id) => BigInt(id));

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

    return { message: 'Đã cập nhật thứ tự module thành công' };
  }

  // =========================================================================
  // 3. LESSON APIS
  // =========================================================================

  async createLesson(userId: bigint, role: UserRole, moduleId: bigint, dto: CreateLessonDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module không tồn tại');

    await this.verifyClassTeacherAccess(module.course.classId, userId, role);

    const maxOrder = await this.prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const nextOrder = (maxOrder?.orderIndex ?? 0) + 1;
    const initialStatus = dto.status ?? LessonStatus.DRAFT;

    return this.prisma.lesson.create({
      data: {
        moduleId,
        title: dto.title.trim(),
        content: dto.content ?? '',
        status: initialStatus,
        publishedAt: initialStatus === LessonStatus.PUBLISHED ? new Date() : null,
        orderIndex: nextOrder,
      },
    });
  }

  async getLessonDetail(userId: bigint, role: UserRole, lessonId: bigint) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
        resources: true,
      },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    const classId = lesson.module.course.classId;
    await this.verifyClassMemberOrTeacherAccess(classId, userId, role);

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
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    await this.verifyClassTeacherAccess(lesson.module.course.classId, userId, role);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === LessonStatus.PUBLISHED && lesson.status !== LessonStatus.PUBLISHED) {
        updateData.publishedAt = new Date();
      }
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
    });
  }

  async deleteLesson(userId: bigint, role: UserRole, lessonId: bigint) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    await this.verifyClassTeacherAccess(lesson.module.course.classId, userId, role);

    await this.prisma.lesson.delete({
      where: { id: lessonId },
    });

    return { message: 'Đã xóa bài học thành công' };
  }

  async reorderLessons(userId: bigint, role: UserRole, moduleId: bigint, lessonIds: (string | number)[]) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module không tồn tại');

    await this.verifyClassTeacherAccess(module.course.classId, userId, role);

    const parsedIds = lessonIds.map((id) => BigInt(id));

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
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    if (lesson.status !== LessonStatus.PUBLISHED) {
      throw new ForbiddenException('Chỉ có thể đánh dấu bài học đã xuất bản');
    }

    const classId = lesson.module.course.classId;
    await this.verifyClassMemberOrTeacherAccess(classId, studentId, UserRole.STUDENT);

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
