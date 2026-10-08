import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CourseStatus, EnrollmentStatus } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { UpdateCourseStatusDto } from './dto/update-course-status.dto.js';
import { generateCourseCode } from './utils/course-code.util.js';

export interface CourseListFilter {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type ClassListFilter = CourseListFilter;

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo môn học mới (chỉ dành cho Giảng viên / Giáo viên)
   * Tự động sinh mã duy nhất có cơ chế retry khi đụng unique constraint.
   */
  async create(teacherId: bigint, dto: CreateCourseDto) {
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const courseCode = generateCourseCode();
      try {
        const course = await this.prisma.course.create({
          data: {
            ownerId: teacherId,
            courseCode,
            name: dto.name,
            description: dto.description ?? null,
            status: CourseStatus.ACTIVE,
          },
        });
        return course;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.logger.warn(
            `Trùng mã môn học ${courseCode} ở lần thử ${attempt}. Đang sinh lại mã...`,
          );
          if (attempt === maxRetries) {
            throw new InternalServerErrorException(
              'Không thể khởi tạo mã môn học duy nhất. Vui lòng thử lại.',
            );
          }
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException(
      'Không thể khởi tạo mã môn học duy nhất. Vui lòng thử lại.',
    );
  }

  /**
   * Cập nhật thông tin môn học (Tên, mô tả)
   * Chỉ cho phép khi môn học chưa bị ARCHIVED.
   */
  async update(courseId: bigint, dto: UpdateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!existing) {
      throw new NotFoundException('Môn học không tồn tại');
    }

    if (existing.status === CourseStatus.ARCHIVED) {
      throw new ConflictException(
        'Môn học đã lưu trữ, không thể chỉnh sửa thông tin',
      );
    }

    const dataToUpdate: Prisma.CourseUpdateInput = {};
    if (dto.name !== undefined) {
      dataToUpdate.name = dto.name;
    }
    if (dto.description !== undefined) {
      dataToUpdate.description = dto.description;
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: dataToUpdate,
    });
  }

  /**
   * Thay đổi trạng thái môn học (Đóng, Lưu trữ, Mở lại)
   */
  async changeStatus(courseId: bigint, dto: UpdateCourseStatusDto) {
    const existing = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!existing) {
      throw new NotFoundException('Môn học không tồn tại');
    }

    if (existing.status === dto.status) {
      throw new ConflictException('Môn học đã ở trạng thái này');
    }

    // Kiểm tra quy tắc chuyển trạng thái
    if (existing.status === CourseStatus.ARCHIVED && dto.status !== CourseStatus.ACTIVE) {
      throw new BadRequestException(
        'Môn học lưu trữ chỉ có thể khôi phục về trạng thái hoạt động',
      );
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: dto.status },
    });
  }

  /**
   * Lấy chi tiết môn học
   */
  async findOne(courseId: bigint) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: EnrollmentStatus.ACTIVE },
            },
            modules: true,
            assignments: true,
            quizzes: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Môn học không tồn tại');
    }

    return course;
  }

  /**
   * Lấy danh sách môn học do giáo viên quản lý
   */
  async findTeacherCourses(teacherId: bigint, filter: CourseListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(50, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      ownerId: teacherId,
    };

    if (filter.status && filter.status !== 'all') {
      const upperStatus = filter.status.toUpperCase();
      if (Object.values(CourseStatus).includes(upperStatus as CourseStatus)) {
        where.status = upperStatus as CourseStatus;
      }
    } else if (!filter.status) {
      // Mặc định ẩn ARCHIVED nếu không truyền query status
      where.status = {
        in: [CourseStatus.ACTIVE, CourseStatus.CLOSED],
      };
    }

    if (filter.search) {
      const trimmed = filter.search.trim();
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { courseCode: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              enrollments: {
                where: { status: EnrollmentStatus.ACTIVE },
              },
              modules: true,
              assignments: true,
              quizzes: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy danh sách môn học mà sinh viên đang tham gia
   */
  async findStudentCourses(studentId: bigint, filter: CourseListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(50, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      enrollments: {
        some: {
          studentId,
          status: EnrollmentStatus.ACTIVE,
        },
      },
    };

    if (filter.status && filter.status !== 'all') {
      const upperStatus = filter.status.toUpperCase();
      if (Object.values(CourseStatus).includes(upperStatus as CourseStatus)) {
        where.status = upperStatus as CourseStatus;
      }
    } else if (!filter.status) {
      // Mặc định ẩn ARCHIVED nếu không truyền query status
      where.status = {
        in: [CourseStatus.ACTIVE, CourseStatus.CLOSED],
      };
    }

    if (filter.search) {
      const trimmed = filter.search.trim();
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { courseCode: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              enrollments: {
                where: { status: EnrollmentStatus.ACTIVE },
              },
              modules: true,
              assignments: true,
              quizzes: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy danh sách tất cả môn học (Quản trị viên)
   */
  async findAllCourses(filter: CourseListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(50, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {};

    if (filter.status && filter.status !== 'all') {
      const upperStatus = filter.status.toUpperCase();
      if (Object.values(CourseStatus).includes(upperStatus as CourseStatus)) {
        where.status = upperStatus as CourseStatus;
      }
    }

    if (filter.search) {
      const trimmed = filter.search.trim();
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { courseCode: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              enrollments: {
                where: { status: EnrollmentStatus.ACTIVE },
              },
              modules: true,
              assignments: true,
              quizzes: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Sinh viên tham gia môn học bằng mã mời
   * Tự động tái kích hoạt và khôi phục quyền nếu sinh viên từng bị xóa trước đó.
   */
  async joinCourse(studentId: bigint, courseCode: string) {
    const normalizedCode = courseCode.trim().toUpperCase();

    const course = await this.prisma.course.findUnique({
      where: { courseCode: normalizedCode },
    });

    if (!course) {
      throw new NotFoundException('Mã môn học không hợp lệ hoặc không tồn tại');
    }

    if (
      course.status === CourseStatus.CLOSED ||
      course.status === CourseStatus.ARCHIVED
    ) {
      throw new ForbiddenException(
        'Môn học đã đóng hoặc lưu trữ, không thể tham gia',
      );
    }

    // Kiểm tra thông tin đăng ký hiện tại
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        uk_enrollments_course_student: {
          courseId: course.id,
          studentId,
        },
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === EnrollmentStatus.ACTIVE) {
        throw new ConflictException('Bạn đã là thành viên của môn học này');
      }

      // Tái kích hoạt enrollment đã bị REMOVED
      const updatedEnrollment = await this.prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: EnrollmentStatus.ACTIVE,
          removedAt: null,
          joinedAt: new Date(),
        },
      });

      return {
        course,
        enrollment: updatedEnrollment,
        isReactivated: true,
      };
    }

    // Tạo mới enrollment
    const newEnrollment = await this.prisma.enrollment.create({
      data: {
        courseId: course.id,
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    return {
      course,
      enrollment: newEnrollment,
      isReactivated: false,
    };
  }
}

