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

  it('should throw UnauthorizedException when JWT_SECRET is not configured', async () => {
    configService.get.mockReturnValue(undefined);
    const req: any = { headers: { authorization: 'Bearer some-token' } };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Cấu hình bảo mật JWT_SECRET không hợp lệ hoặc bị thiếu')
    );
  });

  it('should throw UnauthorizedException when JWT payload is missing sub/id', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'teacher@eduhub.vn',
      role: UserRole.TEACHER,
    });
    const req: any = { headers: { authorization: 'Bearer some-token' } };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Dữ liệu xác thực trong token không hợp lệ')
    );
  });

  it('should throw UnauthorizedException when JWT payload has invalid role', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: '10',
      email: 'teacher@eduhub.vn',
      role: 'INVALID_ROLE',
    });
    const req: any = { headers: { authorization: 'Bearer some-token' } };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Dữ liệu xác thực trong token không hợp lệ')
    );
  });

  it('should throw UnauthorizedException when JWT payload has empty or non-string email', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: '10',
      email: '   ',
      role: UserRole.STUDENT,
    });
    const req: any = { headers: { authorization: 'Bearer some-token' } };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Dữ liệu xác thực trong token không hợp lệ')
    );
  });

  it('should throw UnauthorizedException when sub/id is an object, boolean, negative or non-numeric', async () => {
    const invalidSubCases = [
      { userId: 10 },
      true,
      false,
      'abc',
      '-5',
      '0',
      0,
      -10,
      10.5,
    ];

    for (const invalidSub of invalidSubCases) {
      jwtService.verifyAsync.mockResolvedValue({
        sub: invalidSub,
        email: 'user@eduhub.vn',
        role: UserRole.STUDENT,
      });
      const req: any = { headers: { authorization: 'Bearer some-token' } };
      const context = createMockContext(req);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Dữ liệu xác thực trong token không hợp lệ')
      );
    }
  });

  it('should accept valid numeric number sub and attach as id', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 25,
      email: 'student@eduhub.vn',
      role: UserRole.STUDENT,
    });
    const req: any = { headers: { authorization: 'Bearer valid-token' } };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user.id).toBe(25);
  });

  it('should authenticate successfully with HttpOnly cookie auth_token when header is absent', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: '50',
      email: 'cookie_user@eduhub.vn',
      role: UserRole.TEACHER,
      fullName: 'Teacher Cookie',
    });
    const req: any = { headers: {}, cookies: { auth_token: 'valid-cookie-token' } };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: '50',
      email: 'cookie_user@eduhub.vn',
      role: UserRole.TEACHER,
      fullName: 'Teacher Cookie',
    });
  });

  it('should authenticate successfully with cookie access_token as fallback', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: '60',
      email: 'fallback@eduhub.vn',
      role: UserRole.STUDENT,
    });
    const req: any = { headers: {}, cookies: { access_token: 'valid-legacy-token' } };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user.id).toBe('60');
  });
});

