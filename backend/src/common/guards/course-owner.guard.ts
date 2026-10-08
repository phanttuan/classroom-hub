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
import { UserRole } from '../../generated/prisma/enums.js';
import { extractCourseId } from './guard-utils.js';
import type { RequestWithCourseContext } from '../interfaces/request-with-user.interface.js';

@Injectable()
export class CourseOwnerGuard implements CanActivate {
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

    // Admin có quyền truy cập quản trị hệ thống
    if (user.role === UserRole.ADMIN) {
      req.course = course;
      return true;
    }

    // Chỉ giáo viên mới có thể là chủ sở hữu môn học
    if (user.role !== UserRole.TEACHER) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác của giáo viên');
    }

    // Kiểm tra giáo viên sở hữu môn học
    const userIdBigInt = BigInt(user.id);
    if (course.ownerId !== userIdBigInt) {
      throw new ForbiddenException('Bạn không phải là giáo viên sở hữu của môn học này');
    }

    req.course = course;
    return true;
  }
}

