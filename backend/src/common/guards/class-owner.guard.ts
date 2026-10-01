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
import { extractClassId } from './guard-utils.js';
import type { RequestWithClassContext } from '../interfaces/request-with-user.interface.js';

@Injectable()
export class ClassOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithClassContext>();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Người dùng chưa được xác thực');
    }

    const classId = extractClassId(req);
    if (classId === null) {
      throw new BadRequestException('Mã lớp học (classId) không hợp lệ hoặc bị thiếu');
    }

    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classId },
    });

    if (!classroom) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    // Admin có quyền truy cập quản trị hệ thống
    if (user.role === UserRole.ADMIN) {
      req.classroom = classroom;
      return true;
    }

    // Kiểm tra giáo viên sở hữu lớp
    const userIdBigInt = BigInt(user.id);
    if (classroom.ownerId !== userIdBigInt) {
      throw new ForbiddenException('Bạn không phải là giáo viên sở hữu của lớp học này');
    }

    req.classroom = classroom;
    return true;
  }
}
