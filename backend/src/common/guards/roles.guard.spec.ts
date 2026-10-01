import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: {
    getAllAndOverride: ReturnType<typeof vi.fn>;
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
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('should allow access if no roles are required on route', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ user: { id: '1', role: UserRole.STUDENT } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException when route requires roles but user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TEACHER]);
    const context = createMockContext({});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should allow access when user role matches required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TEACHER]);
    const context = createMockContext({ user: { id: '2', role: UserRole.TEACHER } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user is ADMIN even if route specifies only TEACHER', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TEACHER]);
    const context = createMockContext({ user: { id: '99', role: UserRole.ADMIN } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user role is not in allowed roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TEACHER]);
    const context = createMockContext({ user: { id: '3', role: UserRole.STUDENT } });
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Bạn không có quyền truy cập vào tài nguyên này')
    );
  });

  it('should allow access when user role matches one of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TEACHER, UserRole.ADMIN]);
    const context = createMockContext({ user: { id: '4', role: UserRole.TEACHER } });
    expect(guard.canActivate(context)).toBe(true);
  });
});
