import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CourseMemberGuard } from './course-member.guard.js';
import { PrismaService } from '../../database/prisma.service.js';
import { UserRole, EnrollmentStatus } from '../../generated/prisma/enums.js';

describe('CourseMemberGuard', () => {
  let guard: CourseMemberGuard;
  let prismaService: {
    course: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    enrollment: {
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
      enrollment: {
        findUnique: vi.fn(),
      },
    };
    guard = new CourseMemberGuard(prismaService as unknown as PrismaService);
  });

  it('should throw UnauthorizedException when req.user is missing', async () => {
    const context = createMockContext({ params: { courseId: '1' } });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw BadRequestException when courseId is missing or invalid', async () => {
    const context = createMockContext({
      user: { id: '50', role: UserRole.STUDENT },
      params: {},
    });
    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when course does not exist', async () => {
    prismaService.course.findUnique.mockResolvedValue(null);
    const context = createMockContext({
      user: { id: '50', role: UserRole.STUDENT },
      params: { courseId: '999' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should pass when user is course owner (teacher viewing own course content)', async () => {
    const mockCourse = {
      id: 1n,
      ownerId: 10n,
      name: 'Toán 12',
    };
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

  it('should throw ForbiddenException when teacher is not the course owner', async () => {
    const mockCourse = {
      id: 1n,
      ownerId: 99n,
      name: 'Toán 12',
    };
    prismaService.course.findUnique.mockResolvedValue(mockCourse);

    const context = createMockContext({
      user: { id: '10', role: UserRole.TEACHER },
      params: { courseId: '1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow ADMIN unconditionally', async () => {
    const mockCourse = { id: 1n, ownerId: 10n };
    prismaService.course.findUnique.mockResolvedValue(mockCourse);

    const req: any = {
      user: { id: '1', role: UserRole.ADMIN },
      params: { courseId: '1' },
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.course).toEqual(mockCourse);
  });

  it('should pass when student has ACTIVE enrollment', async () => {
    const mockCourse = { id: 1n, ownerId: 10n };
    const mockEnrollment = {
      id: 101n,
      courseId: 1n,
      studentId: 50n,
      status: EnrollmentStatus.ACTIVE,
    };

    prismaService.course.findUnique.mockResolvedValue(mockCourse);
    prismaService.enrollment.findUnique.mockResolvedValue(mockEnrollment);

    const req: any = {
      user: { id: '50', role: UserRole.STUDENT },
      params: { courseId: '1' },
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.course).toEqual(mockCourse);
    expect(req.enrollment).toEqual(mockEnrollment);
  });

  it('should throw ForbiddenException when student is not enrolled', async () => {
    const mockCourse = { id: 1n, ownerId: 10n };
    prismaService.course.findUnique.mockResolvedValue(mockCourse);
    prismaService.enrollment.findUnique.mockResolvedValue(null);

    const context = createMockContext({
      user: { id: '50', role: UserRole.STUDENT },
      params: { courseId: '1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when student enrollment status is REMOVED', async () => {
    const mockCourse = { id: 1n, ownerId: 10n };
    const mockEnrollment = {
      id: 101n,
      courseId: 1n,
      studentId: 50n,
      status: EnrollmentStatus.REMOVED,
    };

    prismaService.course.findUnique.mockResolvedValue(mockCourse);
    prismaService.enrollment.findUnique.mockResolvedValue(mockEnrollment);

    const context = createMockContext({
      user: { id: '50', role: UserRole.STUDENT },
      params: { courseId: '1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

