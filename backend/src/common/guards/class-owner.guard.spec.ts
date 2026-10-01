import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ClassOwnerGuard } from './class-owner.guard.js';
import { PrismaService } from '../../database/prisma.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('ClassOwnerGuard', () => {
  let guard: ClassOwnerGuard;
  let prismaService: {
    classroom: {
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
      classroom: {
        findUnique: vi.fn(),
      },
    };
    guard = new ClassOwnerGuard(prismaService as unknown as PrismaService);
  });

  it('should throw UnauthorizedException when req.user is missing', async () => {
    const context = createMockContext({ params: { classId: '1' } });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw BadRequestException when classId is missing or invalid', async () => {
    const context = createMockContext({
      user: { id: '10', role: UserRole.TEACHER },
      params: {},
    });
    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when class does not exist in DB', async () => {
    prismaService.classroom.findUnique.mockResolvedValue(null);
    const context = createMockContext({
      user: { id: '10', role: UserRole.TEACHER },
      params: { classId: '999' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when teacher is NOT the class owner (cross-class access)', async () => {
    prismaService.classroom.findUnique.mockResolvedValue({
      id: BigInt(1),
      ownerId: BigInt(20), // Owned by Teacher 20
      name: 'Toán 12A1',
    });
    const context = createMockContext({
      user: { id: '10', role: UserRole.TEACHER }, // Teacher 10 attempts access
      params: { classId: '1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when student attempts to access teacher-only class endpoint', async () => {
    prismaService.classroom.findUnique.mockResolvedValue({
      id: BigInt(1),
      ownerId: BigInt(20),
      name: 'Toán 12A1',
    });
    const context = createMockContext({
      user: { id: '55', role: UserRole.STUDENT }, // Student attempts access
      params: { classId: '1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Bạn không phải là giáo viên sở hữu của lớp học này')
    );
  });

  it('should pass and attach req.classroom when teacher IS the class owner', async () => {
    const mockClassroom = {
      id: BigInt(1),
      ownerId: BigInt(10),
      name: 'Toán 12A1',
    };
    prismaService.classroom.findUnique.mockResolvedValue(mockClassroom);

    const req: any = {
      user: { id: '10', role: UserRole.TEACHER },
      params: { classId: '1' },
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.classroom).toEqual(mockClassroom);
  });

  it('should pass and attach req.classroom when user has ADMIN role', async () => {
    const mockClassroom = {
      id: BigInt(1),
      ownerId: BigInt(20),
      name: 'Toán 12A1',
    };
    prismaService.classroom.findUnique.mockResolvedValue(mockClassroom);

    const req: any = {
      user: { id: '999', role: UserRole.ADMIN },
      params: { classId: '1' },
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.classroom).toEqual(mockClassroom);
  });
});
