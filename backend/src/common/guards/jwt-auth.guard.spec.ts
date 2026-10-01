import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: {
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  const createMockContext = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getClass: () => vi.fn() as any,
      getHandler: () => vi.fn() as any,
      getArgs: () => [] as any,
      getArgByIndex: () => ({}) as any,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
      getType: () => 'http' as any,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verifyAsync: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue('test-jwt-secret'),
    };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService
    );
  });

  it('should throw UnauthorizedException when Authorization header is missing', async () => {
    const context = createMockContext({ headers: {} });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Vui lòng đăng nhập để tiếp tục')
    );
  });

  it('should throw UnauthorizedException when Authorization header format is not Bearer', async () => {
    const context = createMockContext({ headers: { authorization: 'Basic 12345' } });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Vui lòng đăng nhập để tiếp tục')
    );
  });

  it('should throw UnauthorizedException when JWT verification fails or expires', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const context = createMockContext({ headers: { authorization: 'Bearer expired-token' } });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn')
    );
  });

  it('should verify token, attach user to req, and return true when token is valid', async () => {
    const mockPayload = {
      sub: '10',
      email: 'teacher@eduhub.vn',
      role: UserRole.TEACHER,
      fullName: 'Nguyễn Văn A',
    };
    jwtService.verifyAsync.mockResolvedValue(mockPayload);

    const req: any = { headers: { authorization: 'Bearer valid-jwt-token' } };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: '10',
      email: 'teacher@eduhub.vn',
      role: UserRole.TEACHER,
      fullName: 'Nguyễn Văn A',
    });
  });
});

