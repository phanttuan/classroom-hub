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
import { UserRole, MembershipStatus } from '../../generated/prisma/enums.js';
import { extractClassId } from './guard-utils.js';
import type { RequestWithClassContext } from '../interfaces/request-with-user.interface.js';

@Injectable()
export class ClassMemberGuard implements CanActivate {
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

    const userIdBigInt = BigInt(user.id);

    // Admin hoặc Giáo viên chủ lớp luôn có quyền xem tài nguyên lớp
    if (user.role === UserRole.ADMIN || classroom.ownerId === userIdBigInt) {
      req.classroom = classroom;
      return true;
    }

    // Kiểm tra tư cách thành viên của học sinh
    const membership = await this.prisma.classMembership.findUnique({
      where: {
        uk_class_memberships_class_student: {
          classId: classId,
          studentId: userIdBigInt,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Bạn chưa tham gia lớp học này');
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('Bạn đã bị gỡ khỏi lớp học này');
    }

    req.classroom = classroom;
    req.classMembership = membership;
    return true;
  }
}
