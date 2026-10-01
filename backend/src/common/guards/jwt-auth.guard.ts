import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { RequestWithUser, AuthenticatedUser } from '../interfaces/request-with-user.interface.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
        'classroom-hub-default-jwt-secret';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      const user: AuthenticatedUser = {
        id: payload.sub ?? payload.id,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
      };

      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
  }
}

