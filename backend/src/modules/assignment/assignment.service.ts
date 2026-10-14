import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ActivityStatus,
  GradeCategory,
  UserRole,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';

export interface AssignmentViewer {
  id: bigint;
  role: UserRole;
}

function formatScore(
  val: Prisma.Decimal | number | string | null | undefined,
): string | null {
  if (val === null || val === undefined) return null;
  if (
    typeof val === 'object' &&
    'toFixed' in val &&
    typeof val.toFixed === 'function'
  ) {
    return val.toFixed(2);
  }
  const num = Number(val);
  return Number.isNaN(num) ? String(val) : num.toFixed(2);
}

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo bài tập mới ở trạng thái DRAFT kèm GradeItem (category: ASSIGNMENT) trong cùng transaction
   */
  async create(
    teacherId: bigint,
    courseId: bigint,
    dto: CreateAssignmentDto,
  ) {
    const openAt = new Date(dto.openAt);
    const dueAt = new Date(dto.dueAt);

    if (
      Number.isNaN(openAt.getTime()) ||
      Number.isNaN(dueAt.getTime()) ||
      dueAt <= openAt
    ) {
      throw new BadRequestException(
        'Hạn nộp (dueAt) phải lớn hơn thời gian mở bài tập (openAt)',
      );
    }

    const moduleId = BigInt(dto.moduleId);
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });

    if (!module || module.courseId !== courseId) {
      throw new BadRequestException(
        'Topic (moduleId) không tồn tại hoặc không thuộc khóa học này',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          courseId,
          moduleId,
          createdBy: teacherId,
          title: dto.title.trim(),
          description: dto.description ?? null,
          maxScore: new Prisma.Decimal(dto.maxScore),
          openAt,
          dueAt,
          status: ActivityStatus.DRAFT,
        },
      });

      const gradeItem = await tx.gradeItem.create({
        data: {
          courseId,
          category: GradeCategory.ASSIGNMENT,
          assignmentId: assignment.id,
          maxScore: new Prisma.Decimal(dto.maxScore),
        },
      });

      return this.formatAssignment(assignment, { gradeItemId: gradeItem.id });
    });
  }

  /**
   * Lấy danh sách bài tập trong khóa học
   * - Giáo viên / Admin: xem tất cả, hỗ trợ lọc theo ?status= và ?moduleId=
   * - Sinh viên: chỉ thấy bài tập PUBLISHED hoặc CLOSED, kèm mySubmission
   */
  async findAll(
    courseId: bigint,
    viewer: AssignmentViewer,
    statusFilter?: string,
    moduleIdFilter?: string,
  ) {
    let parsedModuleId: bigint | undefined;
    if (moduleIdFilter !== undefined) {
      const trimmed = moduleIdFilter.trim();
      if (!/^[1-9]\d*$/.test(trimmed)) {
        throw new BadRequestException('Mã chủ đề (moduleId) không hợp lệ');
      }
      parsedModuleId = BigInt(trimmed);
    }

    if (viewer.role === UserRole.STUDENT) {
      const where: Prisma.AssignmentWhereInput = {
        courseId,
        status: {
          in: [ActivityStatus.PUBLISHED, ActivityStatus.CLOSED],
        },
      };
      if (parsedModuleId !== undefined) {
        where.moduleId = parsedModuleId;
      }

      const assignments = await this.prisma.assignment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const results = await Promise.all(
        assignments.map(async (assignment) => {
          const submission = await this.prisma.submission.findUnique({
            where: {
              uk_submissions_assignment_student: {
                assignmentId: assignment.id,
                studentId: viewer.id,
              },
            },
          });

          const mySubmission = submission
            ? {
                status: submission.status,
                score: formatScore(
                  (submission as { score?: Prisma.Decimal | number | string | null }).score,
                ),
                submittedAt: submission.submittedAt,
              }
            : null;

          return this.formatAssignment(assignment, { mySubmission });
        }),
      );

      return results;
    }

    const where: Prisma.AssignmentWhereInput = { courseId };

    if (parsedModuleId !== undefined) {
      where.moduleId = parsedModuleId;
    }

    if (statusFilter) {
      const upperStatus = statusFilter.trim().toUpperCase();
      if (
        !Object.values(ActivityStatus).includes(upperStatus as ActivityStatus)
      ) {
        throw new BadRequestException('Trạng thái bài tập không hợp lệ');
      }
      where.status = upperStatus as ActivityStatus;
    }

    const assignments = await this.prisma.assignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((assignment) => this.formatAssignment(assignment));
  }

  /**
   * Lấy chi tiết một bài tập trong khóa học
   */
  async findOne(
    courseId: bigint,
    assignmentId: bigint,
    viewer: AssignmentViewer,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.courseId !== courseId) {
      throw new NotFoundException('Bài tập không tồn tại trong khóa học này');
    }

    if (viewer.role === UserRole.STUDENT) {
      if (assignment.status === ActivityStatus.DRAFT) {
        throw new ForbiddenException(
          'Sinh viên không có quyền xem bài tập đang ở trạng thái nháp',
        );
      }

      const submission = await this.prisma.submission.findUnique({
        where: {
          uk_submissions_assignment_student: {
            assignmentId: assignment.id,
            studentId: viewer.id,
          },
        },
      });

      const mySubmission = submission
        ? {
            status: submission.status,
            score: formatScore(
              (submission as { score?: Prisma.Decimal | number | string | null }).score,
            ),
            submittedAt: submission.submittedAt,
          }
        : null;

      return this.formatAssignment(assignment, { mySubmission });
    }

    return this.formatAssignment(assignment);
  }

  /**
   * Cập nhật bài tập (chỉ cho phép khi đang ở trạng thái DRAFT).
   * Nếu đổi maxScore thì đồng bộ GradeItem.maxScore trong cùng transaction.
   */
  async update(
    _teacherId: bigint,
    courseId: bigint,
    assignmentId: bigint,
    dto: UpdateAssignmentDto,
  ) {
    const existing = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!existing || existing.courseId !== courseId) {
      throw new NotFoundException('Bài tập không tồn tại trong khóa học này');
    }

    if (existing.status !== ActivityStatus.DRAFT) {
      throw new ConflictException(
        'Chỉ có thể chỉnh sửa bài tập khi đang ở trạng thái nháp (DRAFT)',
      );
    }

    if (dto.openAt !== undefined || dto.dueAt !== undefined) {
      const nextOpenAt =
        dto.openAt !== undefined ? new Date(dto.openAt) : existing.openAt;
      const nextDueAt =
        dto.dueAt !== undefined ? new Date(dto.dueAt) : existing.dueAt;

      if (
        Number.isNaN(nextOpenAt.getTime()) ||
        Number.isNaN(nextDueAt.getTime()) ||
        nextDueAt <= nextOpenAt
      ) {
        throw new BadRequestException(
          'Hạn nộp (dueAt) phải lớn hơn thời gian mở bài tập (openAt)',
        );
      }
    }

    const dataToUpdate: Prisma.AssignmentUpdateInput = {};
    if (dto.moduleId !== undefined) {
      const newModuleId = BigInt(dto.moduleId);
      const mod = await this.prisma.module.findUnique({
        where: { id: newModuleId },
        select: { courseId: true },
      });
      if (!mod || mod.courseId !== courseId) {
        throw new BadRequestException(
          'Topic (moduleId) không tồn tại hoặc không thuộc khóa học này',
        );
      }
      dataToUpdate.module = { connect: { id: newModuleId } };
    }
    if (dto.title !== undefined) {
      dataToUpdate.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      dataToUpdate.description = dto.description;
    }
    if (dto.openAt !== undefined) {
      dataToUpdate.openAt = new Date(dto.openAt);
    }
    if (dto.dueAt !== undefined) {
      dataToUpdate.dueAt = new Date(dto.dueAt);
    }
    if (dto.maxScore !== undefined) {
      dataToUpdate.maxScore = new Prisma.Decimal(dto.maxScore);
    }

    if (dto.maxScore !== undefined) {
      const newMaxScore = new Prisma.Decimal(dto.maxScore);
      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedAssignment = await tx.assignment.update({
          where: { id: assignmentId },
          data: dataToUpdate,
        });

        await tx.gradeItem.update({
          where: { assignmentId },
          data: { maxScore: newMaxScore },
        });

        return updatedAssignment;
      });

      return this.formatAssignment(updated);
    }

    const updated = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: dataToUpdate,
    });

    return this.formatAssignment(updated);
  }

  /**
   * Xuất bản bài tập (DRAFT -> PUBLISHED)
   */
  async publish(courseId: bigint, assignmentId: bigint) {
    const existing = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!existing || existing.courseId !== courseId) {
      throw new NotFoundException('Bài tập không tồn tại trong khóa học này');
    }

    if (existing.status !== ActivityStatus.DRAFT) {
      throw new ConflictException(
        'Chỉ có thể xuất bản bài tập đang ở trạng thái nháp (DRAFT)',
      );
    }

    if (existing.dueAt <= existing.openAt) {
      throw new BadRequestException(
        'Hạn nộp (dueAt) phải lớn hơn thời gian mở bài tập (openAt)',
      );
    }

    const updated = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        status: ActivityStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    // TODO (FR-EDU-102): Gửi thông báo cho sinh viên trong khóa học khi NotificationService được triển khai

    return this.formatAssignment(updated);
  }

  /**
   * Đóng bài tập (PUBLISHED -> CLOSED)
   */
  async close(courseId: bigint, assignmentId: bigint) {
    const existing = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!existing || existing.courseId !== courseId) {
      throw new NotFoundException('Bài tập không tồn tại trong khóa học này');
    }

    if (existing.status !== ActivityStatus.PUBLISHED) {
      throw new ConflictException(
        'Chỉ có thể đóng bài tập đang ở trạng thái đã xuất bản (PUBLISHED)',
      );
    }

    const updated = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        status: ActivityStatus.CLOSED,
      },
    });

    return this.formatAssignment(updated);
  }

  private formatAssignment(
    assignment: {
      id: bigint;
      courseId: bigint;
      moduleId: bigint;
      createdBy: bigint;
      title: string;
      description: string | null;
      maxScore: Prisma.Decimal | number | string;
      openAt: Date;
      dueAt: Date;
      status: ActivityStatus;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    extra?: {
      gradeItemId?: bigint;
      mySubmission?: {
        status: string;
        score: string | null;
        submittedAt: Date;
      } | null;
    },
  ) {
    return {
      id: assignment.id.toString(),
      courseId: assignment.courseId.toString(),
      moduleId: assignment.moduleId.toString(),
      createdBy: assignment.createdBy.toString(),
      title: assignment.title,
      description: assignment.description,
      maxScore: formatScore(assignment.maxScore)!,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      status: assignment.status,
      publishedAt: assignment.publishedAt,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      ...(extra?.gradeItemId !== undefined
        ? { gradeItemId: extra.gradeItemId.toString() }
        : {}),
      ...(extra && 'mySubmission' in extra
        ? { mySubmission: extra.mySubmission }
        : {}),
    };
  }
}

