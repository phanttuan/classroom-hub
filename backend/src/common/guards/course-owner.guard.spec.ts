import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CourseOwnerGuard } from './course-owner.guard.js';
import { PrismaService } from '../../database/prisma.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('CourseOwnerGuard', () => {
  let guard: CourseOwnerGuard;
  let prismaService: {
    course: {
      findUnique: ReturnType<typeof vi.fn>;
    };
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
    prismaService = {
      course: {
        findUnique: vi.fn(),
      },
    };
    guard = new CourseOwnerGuard(prismaService as unknown as PrismaService);
  });

  it('should throw UnauthorizedException when req.user is missing', async () => {
    const context = createMockContext({ params: { courseId: '1' } });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw BadRequestException when courseId is missing or invalid', async () => {
    const context = createMockContext({
      user: { id: '10', role: UserRole.TEACHER },
      params: {},
    });
    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when course does not exist in DB', async () => {
    prismaService.course.findUnique.mockResolvedValue(null);
    const context = createMockContext({
      user: { id: '10', role: UserRole.TEACHER },
      params: { courseId: '1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should allow ADMIN unconditionally and attach course to request', async () => {
    const mockCourse = { id: 1n, ownerId: 99n, name: 'Admin Course' };
    prismaService.course.findUnique.mockResolvedValue(mockCourse);

    const req: any = {
      user: { id: '10', role: UserRole.ADMIN },
      params: { courseId: '1' },
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.course).toEqual(mockCourse);
  });

  it('should throw ForbiddenException if user is STUDENT', async () => {
    const mockCourse = { id: 1n, ownerId: 10n };
    prismaService.course.findUnique.mockResolvedValue(mockCourse);

    const context = createMockContext({
      user: { id: '10', role: UserRole.STUDENT },
      params: { courseId: '1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if TEACHER is not the owner', async () => {
    const mockCourse = { id: 1n, ownerId: 99n };
    prismaService.course.findUnique.mockResolvedValue(mockCourse);

    const context = createMockContext({
      user: { id: '10', role: UserRole.TEACHER },
      params: { courseId: '1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow TEACHER who owns the course and attach course to request', async () => {
    const mockCourse = { id: 1n, ownerId: 10n, name: 'Teacher Course' };
    prismaService.course.findUnique.mockResolvedValue(mockCourse);

    const req: any = {
      user: { id: '10', role: UserRole.TEACHER },
      params: { courseId: '1' },
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.course).toEqual(mockCourse);
  });
});

