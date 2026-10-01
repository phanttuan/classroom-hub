import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithUser, AuthenticatedUser } from '../interfaces/request-with-user.interface.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

function isValidUserId(id: unknown): boolean {
  if (typeof id === 'number') {
    return Number.isInteger(id) && id > 0;
  }
  if (typeof id === 'string') {
    return /^[1-9]\d*$/.test(id.trim());
  }
  if (typeof id === 'bigint') {
    return id > 0n;
  }
  return false;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly reflector?: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        return true;
      }
    }

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục');
    }

    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        this.configService.get<string>('JWT_ACCESS_SECRET');

      if (!secret) {
        throw new UnauthorizedException('Cấu hình bảo mật JWT_SECRET không hợp lệ hoặc bị thiếu');
      }

      const payload = await this.jwtService.verifyAsync(token, { secret });

      const userId = payload?.sub ?? payload?.id;
      const email = payload?.email;
      const role = payload?.role;

      if (
        !isValidUserId(userId) ||
        typeof email !== 'string' ||
        !email.trim() ||
        !Object.values(UserRole).includes(role)
      ) {
        throw new UnauthorizedException('Dữ liệu xác thực trong token không hợp lệ');
      }

      const user: AuthenticatedUser = {
        id: typeof userId === 'string' ? userId.trim() : (userId as number | bigint),
        email: email.trim(),
        role: role as UserRole,
        fullName: typeof payload.fullName === 'string' ? payload.fullName : undefined,
      };

      req.user = user;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
  }
}
