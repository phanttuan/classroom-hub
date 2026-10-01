import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ClassMemberGuard } from './class-member.guard.js';
import { PrismaService } from '../../database/prisma.service.js';
import { UserRole, MembershipStatus } from '../../generated/prisma/enums.js';

describe('ClassMemberGuard', () => {
  let guard: ClassMemberGuard;
  let prismaService: {
    classroom: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    classMembership: {
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
      classMembership: {
        findUnique: vi.fn(),
      },
    };
    guard = new ClassMemberGuard(prismaService as unknown as PrismaService);
  });

  it('should throw UnauthorizedException when req.user is missing', async () => {
    const context = createMockContext({ params: { classId: '1' } });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw BadRequestException when classId is missing or invalid', async () => {
    const context = createMockContext({
      user: { id: '50', role: UserRole.STUDENT },
      params: {},
    });
    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when class does not exist', async () => {
    prismaService.classroom.findUnique.mockResolvedValue(null);
    const context = createMockContext({
      user: { id: '50', role: UserRole.STUDENT },
      params: { classId: '999' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should pass when user is class owner (teacher viewing own class content)', async () => {
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

  it('should throw ForbiddenException when student is NOT a member (cross-class access)', async () => {
    prismaService.classroom.findUnique.mockResolvedValue({
      id: BigInt(1),
      ownerId: BigInt(10),
      name: 'Toán 12A1',
    });
    prismaService.classMembership.findUnique.mockResolvedValue(null);

    const context = createMockContext({
      user: { id: '50', role: UserRole.STUDENT },
      params: { classId: '1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Bạn chưa tham gia lớp học này')
    );
  });

  it('should throw ForbiddenException when student status is REMOVED', async () => {
    prismaService.classroom.findUnique.mockResolvedValue({
      id: BigInt(1),
      ownerId: BigInt(10),
      name: 'Toán 12A1',
    });
    prismaService.classMembership.findUnique.mockResolvedValue({
      id: BigInt(101),
      classId: BigInt(1),
      studentId: BigInt(50),
      status: MembershipStatus.REMOVED,
    });

    const context = createMockContext({
      user: { id: '50', role: UserRole.STUDENT },
      params: { classId: '1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Bạn đã bị gỡ khỏi lớp học này')
    );
  });

  it('should pass and attach classroom and classMembership when student is ACTIVE member', async () => {
    const mockClassroom = {
      id: BigInt(1),
      ownerId: BigInt(10),
      name: 'Toán 12A1',
    };
    const mockMembership = {
      id: BigInt(101),
      classId: BigInt(1),
      studentId: BigInt(50),
      status: MembershipStatus.ACTIVE,
    };
    prismaService.classroom.findUnique.mockResolvedValue(mockClassroom);
    prismaService.classMembership.findUnique.mockResolvedValue(mockMembership);

    const req: any = {
      user: { id: '50', role: UserRole.STUDENT },
      params: { classId: '1' },
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.classroom).toEqual(mockClassroom);
    expect(req.classMembership).toEqual(mockMembership);
  });

  it('should pass and attach classroom when user is ADMIN', async () => {
    const mockClassroom = {
      id: BigInt(1),
      ownerId: BigInt(10),
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

  it('should throw ForbiddenException when teacher is NOT the class owner', async () => {
    prismaService.classroom.findUnique.mockResolvedValue({
      id: BigInt(1),
      ownerId: BigInt(10),
      name: 'Toán 12A1',
    });

    const req: any = {
      user: { id: '20', role: UserRole.TEACHER },
      params: { classId: '1' },
    };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Bạn không phải là giáo viên phụ trách lớp học này')
    );
  });

  it('should throw ForbiddenException when user has unexpected role', async () => {
    prismaService.classroom.findUnique.mockResolvedValue({
      id: BigInt(1),
      ownerId: BigInt(10),
      name: 'Toán 12A1',
    });

    const req: any = {
      user: { id: '50', role: 'GUEST' as any },
      params: { classId: '1' },
    };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Bạn không có quyền truy cập vào lớp học này')
    );
  });
});
