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
import { ClassStatus, MembershipStatus } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { UpdateClassStatusDto } from './dto/update-class-status.dto.js';
import { generateClassCode } from './utils/class-code.util.js';

export interface ClassListFilter {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ClassService {
  private readonly logger = new Logger(ClassService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo lớp học mới (UC-05, FR-EDU-013, FR-EDU-014, BR-EDU-014..017)
   * Tự động sinh mã duy nhất có cơ chế retry khi đụng unique constraint.
   */
  async create(teacherId: bigint, dto: CreateClassDto) {
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const classCode = generateClassCode();
      try {
        const classroom = await this.prisma.classroom.create({
          data: {
            ownerId: teacherId,
            classCode,
            name: dto.name,
            description: dto.description ?? null,
            status: ClassStatus.ACTIVE,
          },
        });
        return classroom;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.logger.warn(
            `Trùng mã lớp ${classCode} ở lần thử ${attempt}. Đang sinh lại mã...`,
          );
          if (attempt === maxRetries) {
            throw new InternalServerErrorException(
              'Không thể khởi tạo mã lớp học duy nhất. Vui lòng thử lại.',
            );
          }
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException(
      'Không thể khởi tạo mã lớp học duy nhất. Vui lòng thử lại.',
    );
  }

  /**
   * Cập nhật thông tin lớp học (UC-05, FR-EDU-015, BR-EDU-024)
   * Chỉ cho phép khi lớp chưa bị ARCHIVED.
   */
  async update(classId: bigint, dto: UpdateClassDto) {
    const existing = await this.prisma.classroom.findUnique({
      where: { id: classId },
    });

    if (!existing) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    if (existing.status === ClassStatus.ARCHIVED) {
      throw new ConflictException(
        'Lớp học đã lưu trữ, không thể chỉnh sửa thông tin',
      );
    }

    const dataToUpdate: Prisma.ClassroomUpdateInput = {};
    if (dto.name !== undefined) {
      dataToUpdate.name = dto.name;
    }
    if (dto.description !== undefined) {
      dataToUpdate.description = dto.description;
    }

    return this.prisma.classroom.update({
      where: { id: classId },
      data: dataToUpdate,
    });
  }

  /**
   * Thay đổi trạng thái lớp học (UC-05, FR-EDU-016, BR-EDU-022, BR-EDU-024)
   * Hỗ trợ Đóng (CLOSED), Lưu trữ (ARCHIVED), và Khôi phục (ACTIVE).
   */
  async changeStatus(classId: bigint, dto: UpdateClassStatusDto) {
    const existing = await this.prisma.classroom.findUnique({
      where: { id: classId },
    });

    if (!existing) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    if (existing.status === dto.status) {
      throw new ConflictException('Lớp học đã ở trạng thái này');
    }

    // Kiểm tra quy tắc chuyển trạng thái
    if (existing.status === ClassStatus.ARCHIVED && dto.status !== ClassStatus.ACTIVE) {
      throw new BadRequestException(
        'Lớp học lưu trữ chỉ có thể khôi phục về trạng thái hoạt động',
      );
    }

    return this.prisma.classroom.update({
      where: { id: classId },
      data: { status: dto.status },
    });
  }

  /**
   * Lấy chi tiết lớp học
   */
  async findOne(classId: bigint) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classId },
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
            memberships: {
              where: { status: MembershipStatus.ACTIVE },
            },
            courses: true,
            assignments: true,
            quizzes: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    return classroom;
  }

  /**
   * Lấy danh sách lớp học do giáo viên quản lý
   */
  async findTeacherClasses(teacherId: bigint, filter: ClassListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(50, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ClassroomWhereInput = {
      ownerId: teacherId,
    };

    if (filter.status && filter.status !== 'all') {
      const upperStatus = filter.status.toUpperCase();
      if (Object.values(ClassStatus).includes(upperStatus as ClassStatus)) {
        where.status = upperStatus as ClassStatus;
      }
    } else if (!filter.status) {
      // Mặc định ẩn ARCHIVED nếu không truyền query status
      where.status = {
        in: [ClassStatus.ACTIVE, ClassStatus.CLOSED],
      };
    }

    if (filter.search) {
      const trimmed = filter.search.trim();
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { classCode: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.classroom.count({ where }),
      this.prisma.classroom.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              memberships: {
                where: { status: MembershipStatus.ACTIVE },
              },
              courses: true,
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
   * Lấy danh sách lớp học mà sinh viên đang tham gia (UC-08, FR-EDU-022)
   */
  async findStudentClasses(studentId: bigint, filter: ClassListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(50, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ClassroomWhereInput = {
      memberships: {
        some: {
          studentId,
          status: MembershipStatus.ACTIVE,
        },
      },
    };

    if (filter.status && filter.status !== 'all') {
      const upperStatus = filter.status.toUpperCase();
      if (Object.values(ClassStatus).includes(upperStatus as ClassStatus)) {
        where.status = upperStatus as ClassStatus;
      }
    } else if (!filter.status) {
      // Mặc định ẩn ARCHIVED nếu không truyền query status
      where.status = {
        in: [ClassStatus.ACTIVE, ClassStatus.CLOSED],
      };
    }

    if (filter.search) {
      const trimmed = filter.search.trim();
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { classCode: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.classroom.count({ where }),
      this.prisma.classroom.findMany({
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
              memberships: {
                where: { status: MembershipStatus.ACTIVE },
              },
              courses: true,
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
   * Lấy danh sách tất cả lớp học (UC-08: Quản trị viên)
   */
  async findAllClasses(filter: ClassListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(50, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ClassroomWhereInput = {};

    if (filter.status && filter.status !== 'all') {
      const upperStatus = filter.status.toUpperCase();
      if (Object.values(ClassStatus).includes(upperStatus as ClassStatus)) {
        where.status = upperStatus as ClassStatus;
      }
    }

    if (filter.search) {
      const trimmed = filter.search.trim();
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { classCode: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.classroom.count({ where }),
      this.prisma.classroom.findMany({
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
              memberships: {
                where: { status: MembershipStatus.ACTIVE },
              },
              courses: true,
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
   * Sinh viên tham gia lớp học bằng mã mời (UC-07, FR-EDU-020, BR-EDU-018, BR-EDU-021, BR-EDU-022)
   * Tự động tái kích hoạt và khôi phục quyền nếu sinh viên từng bị xóa trước đó.
   */
  async joinClass(studentId: bigint, classCode: string) {
    const normalizedCode = classCode.trim().toUpperCase();

    const classroom = await this.prisma.classroom.findUnique({
      where: { classCode: normalizedCode },
    });

    if (!classroom) {
      throw new NotFoundException('Mã lớp học không hợp lệ hoặc không tồn tại');
    }

    if (
      classroom.status === ClassStatus.CLOSED ||
      classroom.status === ClassStatus.ARCHIVED
    ) {
      throw new ForbiddenException(
        'Lớp học đã đóng hoặc lưu trữ, không thể tham gia',
      );
    }

    // Kiểm tra thông tin thành viên hiện tại
    const existingMembership = await this.prisma.classMembership.findUnique({
      where: {
        uk_class_memberships_class_student: {
          classId: classroom.id,
          studentId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.status === MembershipStatus.ACTIVE) {
        throw new ConflictException('Bạn đã là thành viên của lớp học này');
      }

      // Tái kích hoạt membership đã bị REMOVED (BR-EDU-021)
      const updatedMembership = await this.prisma.classMembership.update({
        where: { id: existingMembership.id },
        data: {
          status: MembershipStatus.ACTIVE,
          removedAt: null,
          joinedAt: new Date(),
        },
      });

      return {
        classroom,
        membership: updatedMembership,
        isReactivated: true,
      };
    }

    // Tạo mới membership
    const newMembership = await this.prisma.classMembership.create({
      data: {
        classId: classroom.id,
        studentId,
        status: MembershipStatus.ACTIVE,
      },
    });

    return {
      classroom,
      membership: newMembership,
      isReactivated: false,
    };
  }
}
