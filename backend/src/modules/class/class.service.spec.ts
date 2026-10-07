import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClassService } from './class.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ClassStatus, MembershipStatus } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

describe('ClassService', () => {
  let service: ClassService;
  let prisma: {
    classroom: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      classroom: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new ClassService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should create a new classroom with auto-generated classCode and ACTIVE status', async () => {
      const teacherId = 10n;
      const dto = { name: 'Lớp Lập trình Web', description: 'Mô tả lớp' };
      const createdClass = {
        id: 1n,
        ownerId: teacherId,
        classCode: 'ABCDEFGH',
        name: dto.name,
        description: dto.description,
        status: ClassStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.classroom.create.mockResolvedValue(createdClass);

      const result = await service.create(teacherId, dto);
      expect(result).toEqual(createdClass);
      expect(prisma.classroom.create).toHaveBeenCalledTimes(1);
      expect(prisma.classroom.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: teacherId,
          name: dto.name,
          description: dto.description,
          status: ClassStatus.ACTIVE,
          classCode: expect.any(String),
        }),
      });
    });

    it('should retry code generation when unique constraint P2002 is violated and succeed', async () => {
      const teacherId = 10n;
      const dto = { name: 'Lớp Lập trình' };
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.10.0' },
      );

      const successClass = {
        id: 2n,
        ownerId: teacherId,
        classCode: 'XYZ98765',
        name: dto.name,
        description: null,
        status: ClassStatus.ACTIVE,
      };

      // Lần đầu bị trùng mã (P2002), lần 2 thành công
      prisma.classroom.create
        .mockRejectedValueOnce(p2002Error)
        .mockResolvedValueOnce(successClass);

      const result = await service.create(teacherId, dto);
      expect(result).toEqual(successClass);
      expect(prisma.classroom.create).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException when max retries exceeded', async () => {
      const teacherId = 10n;
      const dto = { name: 'Lớp Lập trình' };
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.10.0' },
      );

      prisma.classroom.create.mockRejectedValue(p2002Error);

      await expect(service.create(teacherId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prisma.classroom.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('update', () => {
    it('should update name and description of an active class', async () => {
      const classId = 1n;
      const existing = {
        id: classId,
        name: 'Tên cũ',
        description: 'Mô tả cũ',
        status: ClassStatus.ACTIVE,
      };
      const dto = { name: 'Tên mới', description: 'Mô tả mới' };
      const updated = { ...existing, ...dto };

      prisma.classroom.findUnique.mockResolvedValue(existing);
      prisma.classroom.update.mockResolvedValue(updated);

      const result = await service.update(classId, dto);
      expect(result).toEqual(updated);
      expect(prisma.classroom.update).toHaveBeenCalledWith({
        where: { id: classId },
        data: { name: 'Tên mới', description: 'Mô tả mới' },
      });
    });

    it('should throw NotFoundException if class does not exist', async () => {
      prisma.classroom.findUnique.mockResolvedValue(null);
      await expect(service.update(999n, { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if class is ARCHIVED', async () => {
      const existing = {
        id: 1n,
        name: 'Lớp cũ',
        status: ClassStatus.ARCHIVED,
      };
      prisma.classroom.findUnique.mockResolvedValue(existing);

      await expect(service.update(1n, { name: 'Tên mới' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.classroom.update).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('should change status from ACTIVE to CLOSED', async () => {
      const classId = 1n;
      const existing = { id: classId, status: ClassStatus.ACTIVE };
      const updated = { id: classId, status: ClassStatus.CLOSED };

      prisma.classroom.findUnique.mockResolvedValue(existing);
      prisma.classroom.update.mockResolvedValue(updated);

      const result = await service.changeStatus(classId, {
        status: ClassStatus.CLOSED,
      });
      expect(result.status).toBe(ClassStatus.CLOSED);
      expect(prisma.classroom.update).toHaveBeenCalledWith({
        where: { id: classId },
        data: { status: ClassStatus.CLOSED },
      });
    });

    it('should change status from ACTIVE to ARCHIVED', async () => {
      const classId = 1n;
      const existing = { id: classId, status: ClassStatus.ACTIVE };
      const updated = { id: classId, status: ClassStatus.ARCHIVED };

      prisma.classroom.findUnique.mockResolvedValue(existing);
      prisma.classroom.update.mockResolvedValue(updated);

      const result = await service.changeStatus(classId, {
        status: ClassStatus.ARCHIVED,
      });
      expect(result.status).toBe(ClassStatus.ARCHIVED);
    });

    it('should allow restoring CLOSED to ACTIVE', async () => {
      const classId = 1n;
      const existing = { id: classId, status: ClassStatus.CLOSED };
      const updated = { id: classId, status: ClassStatus.ACTIVE };

      prisma.classroom.findUnique.mockResolvedValue(existing);
      prisma.classroom.update.mockResolvedValue(updated);

      const result = await service.changeStatus(classId, {
        status: ClassStatus.ACTIVE,
      });
      expect(result.status).toBe(ClassStatus.ACTIVE);
    });

    it('should allow restoring ARCHIVED to ACTIVE', async () => {
      const classId = 1n;
      const existing = { id: classId, status: ClassStatus.ARCHIVED };
      const updated = { id: classId, status: ClassStatus.ACTIVE };

      prisma.classroom.findUnique.mockResolvedValue(existing);
      prisma.classroom.update.mockResolvedValue(updated);

      const result = await service.changeStatus(classId, {
        status: ClassStatus.ACTIVE,
      });
      expect(result.status).toBe(ClassStatus.ACTIVE);
    });

    it('should throw ConflictException if target status is same as current status', async () => {
      const classId = 1n;
      const existing = { id: classId, status: ClassStatus.ACTIVE };

      prisma.classroom.findUnique.mockResolvedValue(existing);

      await expect(
        service.changeStatus(classId, { status: ClassStatus.ACTIVE }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if transition from ARCHIVED to CLOSED is attempted', async () => {
      const classId = 1n;
      const existing = { id: classId, status: ClassStatus.ARCHIVED };

      prisma.classroom.findUnique.mockResolvedValue(existing);

      await expect(
        service.changeStatus(classId, { status: ClassStatus.CLOSED }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return classroom with counts', async () => {
      const classId = 1n;
      const classroom = {
        id: classId,
        name: 'Lớp 1',
        classCode: 'ABCDEFGH',
        status: ClassStatus.ACTIVE,
        owner: { id: 10n, fullName: 'Thầy A', email: 'teacher@school.edu.vn' },
        _count: {
          memberships: 15,
          courses: 2,
          assignments: 3,
          quizzes: 1,
        },
      };

      prisma.classroom.findUnique.mockResolvedValue(classroom);

      const result = await service.findOne(classId);
      expect(result).toEqual(classroom);
    });

    it('should throw NotFoundException if classroom not found', async () => {
      prisma.classroom.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99n)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findTeacherClasses', () => {
    it('should list teacher classes with pagination and default exclude archived', async () => {
      const teacherId = 10n;
      const mockClasses = [
        {
          id: 1n,
          name: 'Lớp A',
          classCode: 'ABCDEFGH',
          status: ClassStatus.ACTIVE,
          _count: { memberships: 20, courses: 1, assignments: 2, quizzes: 0 },
        },
      ];

      prisma.classroom.count.mockResolvedValue(1);
      prisma.classroom.findMany.mockResolvedValue(mockClasses);

      const result = await service.findTeacherClasses(teacherId, {});
      expect(result.items).toEqual(mockClasses);
      expect(result.meta.total).toBe(1);
      expect(prisma.classroom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: teacherId,
          }),
        }),
      );
    });
  });
});

