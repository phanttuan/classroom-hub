import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { UserRole, EnrollmentStatus } from '../../generated/prisma/enums.js';
import { extractCourseId } from './guard-utils.js';
import type { RequestWithCourseContext } from '../interfaces/request-with-user.interface.js';

@Injectable()
export class CourseMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithCourseContext>();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Người dùng chưa được xác thực');
    }

    const courseId = extractCourseId(req);
    if (courseId === null) {
      throw new BadRequestException('Mã môn học (courseId) không hợp lệ hoặc bị thiếu');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Môn học không tồn tại');
    }

    const userIdBigInt = BigInt(user.id);

    // 1. Admin hệ thống có quyền truy cập toàn diện
    if (user.role === UserRole.ADMIN) {
      req.course = course;
      return true;
    }

    // 2. Giáo viên sở hữu môn học có quyền xem tài nguyên
    if (user.role === UserRole.TEACHER) {
      if (course.ownerId === userIdBigInt) {
        req.course = course;
        return true;
      }
      throw new ForbiddenException('Bạn không phải là giáo viên phụ trách môn học này');
    }

    // 3. Chỉ sinh viên mới tiếp tục kiểm tra enrollment
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào môn học này');
    }

    // Kiểm tra tư cách tham gia của sinh viên
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        uk_enrollments_course_student: {
          courseId,
          studentId: userIdBigInt,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Bạn chưa tham gia môn học này');
    }

    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('Bạn đã bị gỡ khỏi môn học này');
    }

    req.course = course;
    req.enrollment = enrollment;
    return true;
  }
}

