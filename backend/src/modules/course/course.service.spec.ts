import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { CourseService } from './course.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CourseStatus, EnrollmentStatus } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

describe('CourseService', () => {
  let service: CourseService;
  let prisma: {
    course: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    enrollment: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      course: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      enrollment: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new CourseService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should create a new course with auto-generated courseCode and ACTIVE status', async () => {
      const teacherId = 10n;
      const dto = { name: 'Môn Lập trình Web', description: 'Mô tả môn học' };
      const createdCourse = {
        id: 1n,
        ownerId: teacherId,
        courseCode: 'ABCDEFGH',
        name: dto.name,
        description: dto.description,
        status: CourseStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.course.create.mockResolvedValue(createdCourse);

      const result = await service.create(teacherId, dto);
      expect(result).toEqual(createdCourse);
      expect(prisma.course.create).toHaveBeenCalledTimes(1);
      expect(prisma.course.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: teacherId,
          name: dto.name,
          description: dto.description,
          status: CourseStatus.ACTIVE,
          courseCode: expect.any(String),
        }),
      });
    });

    it('should retry code generation when unique constraint P2002 is violated and succeed', async () => {
      const teacherId = 10n;
      const dto = { name: 'Môn Lập trình' };
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.10.0' },
      );

      const successCourse = {
        id: 2n,
        ownerId: teacherId,
        courseCode: 'XYZ98765',
        name: dto.name,
        description: null,
        status: CourseStatus.ACTIVE,
      };

      prisma.course.create
        .mockRejectedValueOnce(p2002Error)
        .mockResolvedValueOnce(successCourse);

      const result = await service.create(teacherId, dto);
      expect(result).toEqual(successCourse);
      expect(prisma.course.create).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException when max retries exceeded', async () => {
      const teacherId = 10n;
      const dto = { name: 'Môn Lập trình' };
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.10.0' },
      );

      prisma.course.create.mockRejectedValue(p2002Error);

      await expect(service.create(teacherId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prisma.course.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('update', () => {
    it('should update name and description of an active course', async () => {
      const courseId = 1n;
      const existing = {
        id: courseId,
        name: 'Tên cũ',
        description: 'Mô tả cũ',
        status: CourseStatus.ACTIVE,
      };
      const dto = { name: 'Tên mới', description: 'Mô tả mới' };
      const updated = { ...existing, ...dto };

      prisma.course.findUnique.mockResolvedValue(existing);
      prisma.course.update.mockResolvedValue(updated);

      const result = await service.update(courseId, dto);
      expect(result).toEqual(updated);
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { name: 'Tên mới', description: 'Mô tả mới' },
      });
    });

    it('should throw NotFoundException if course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.update(999n, { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if course is ARCHIVED', async () => {
      const existing = {
        id: 1n,
        name: 'Môn cũ',
        status: CourseStatus.ARCHIVED,
      };
      prisma.course.findUnique.mockResolvedValue(existing);

      await expect(service.update(1n, { name: 'Tên mới' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.course.update).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('should change status from ACTIVE to CLOSED', async () => {
      const courseId = 1n;
      const existing = { id: courseId, status: CourseStatus.ACTIVE };
      const updated = { id: courseId, status: CourseStatus.CLOSED };

      prisma.course.findUnique.mockResolvedValue(existing);
      prisma.course.update.mockResolvedValue(updated);

      const result = await service.changeStatus(courseId, {
        status: CourseStatus.CLOSED,
      });
      expect(result.status).toBe(CourseStatus.CLOSED);
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { status: CourseStatus.CLOSED },
      });
    });

    it('should change status from ACTIVE to ARCHIVED', async () => {
      const courseId = 1n;
      const existing = { id: courseId, status: CourseStatus.ACTIVE };
      const updated = { id: courseId, status: CourseStatus.ARCHIVED };

      prisma.course.findUnique.mockResolvedValue(existing);
      prisma.course.update.mockResolvedValue(updated);

      const result = await service.changeStatus(courseId, {
        status: CourseStatus.ARCHIVED,
      });
      expect(result.status).toBe(CourseStatus.ARCHIVED);
    });

    it('should allow restoring CLOSED to ACTIVE', async () => {
      const courseId = 1n;
      const existing = { id: courseId, status: CourseStatus.CLOSED };
      const updated = { id: courseId, status: CourseStatus.ACTIVE };

      prisma.course.findUnique.mockResolvedValue(existing);
      prisma.course.update.mockResolvedValue(updated);

      const result = await service.changeStatus(courseId, {
        status: CourseStatus.ACTIVE,
      });
      expect(result.status).toBe(CourseStatus.ACTIVE);
    });

    it('should allow restoring ARCHIVED to ACTIVE', async () => {
      const courseId = 1n;
      const existing = { id: courseId, status: CourseStatus.ARCHIVED };
      const updated = { id: courseId, status: CourseStatus.ACTIVE };

      prisma.course.findUnique.mockResolvedValue(existing);
      prisma.course.update.mockResolvedValue(updated);

      const result = await service.changeStatus(courseId, {
        status: CourseStatus.ACTIVE,
      });
      expect(result.status).toBe(CourseStatus.ACTIVE);
    });

    it('should throw ConflictException if target status is same as current status', async () => {
      const courseId = 1n;
      const existing = { id: courseId, status: CourseStatus.ACTIVE };

      prisma.course.findUnique.mockResolvedValue(existing);

      await expect(
        service.changeStatus(courseId, { status: CourseStatus.ACTIVE }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if transition from ARCHIVED to CLOSED is attempted', async () => {
      const courseId = 1n;
      const existing = { id: courseId, status: CourseStatus.ARCHIVED };

      prisma.course.findUnique.mockResolvedValue(existing);

      await expect(
        service.changeStatus(courseId, { status: CourseStatus.CLOSED }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return course with counts', async () => {
      const courseId = 1n;
      const mockCourse = {
        id: courseId,
        name: 'Môn 1',
        courseCode: 'ABCDEFGH',
        status: CourseStatus.ACTIVE,
        owner: { id: 10n, fullName: 'Thầy A', email: 'teacher@school.edu.vn' },
        _count: {
          enrollments: 15,
          modules: 2,
          assignments: 3,
          quizzes: 1,
        },
      };

      prisma.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.findOne(courseId);
      expect(result).toEqual(mockCourse);
    });

    it('should throw NotFoundException if course not found', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99n)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findTeacherCourses', () => {
    it('should list teacher courses with pagination and default exclude archived', async () => {
      const teacherId = 10n;
      const mockCourses = [
        {
          id: 1n,
          name: 'Môn A',
          courseCode: 'ABCDEFGH',
          status: CourseStatus.ACTIVE,
          _count: { enrollments: 20, modules: 1, assignments: 2, quizzes: 0 },
        },
      ];

      prisma.course.count.mockResolvedValue(1);
      prisma.course.findMany.mockResolvedValue(mockCourses);

      const result = await service.findTeacherCourses(teacherId, {});
      expect(result.items).toEqual(mockCourses);
      expect(result.meta.total).toBe(1);
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: teacherId,
          }),
        }),
      );
    });
  });

  describe('findStudentCourses', () => {
    it('should list active enrolled courses for student', async () => {
      const studentId = 20n;
      const mockCourses = [
        {
          id: 1n,
          name: 'Môn Lập trình Web',
          courseCode: 'WEB101XX',
          status: CourseStatus.ACTIVE,
          owner: { id: 10n, fullName: 'Thầy A', email: 'teacher@school.edu.vn', avatarUrl: null },
          _count: { enrollments: 25, modules: 2, assignments: 3, quizzes: 1 },
        },
      ];

      prisma.course.count.mockResolvedValue(1);
      prisma.course.findMany.mockResolvedValue(mockCourses);

      const result = await service.findStudentCourses(studentId, {});
      expect(result.items).toEqual(mockCourses);
      expect(result.meta.total).toBe(1);
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enrollments: {
              some: {
                studentId,
                status: EnrollmentStatus.ACTIVE,
              },
            },
            status: {
              in: [CourseStatus.ACTIVE, CourseStatus.CLOSED],
            },
          }),
        }),
      );
    });
  });

  describe('findAllCourses', () => {
    it('should list all courses for admin with pagination', async () => {
      const mockCourses = [
        {
          id: 1n,
          name: 'Môn A',
          courseCode: 'ABCDEFGH',
          status: CourseStatus.ACTIVE,
        },
      ];

      prisma.course.count.mockResolvedValue(1);
      prisma.course.findMany.mockResolvedValue(mockCourses);

      const result = await service.findAllCourses({});
      expect(result.items).toEqual(mockCourses);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('joinCourse', () => {
    const studentId = 20n;
    const courseCode = 'CODE1234';

    it('should throw NotFoundException if course code does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(service.joinCourse(studentId, courseCode)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.course.findUnique).toHaveBeenCalledWith({
        where: { courseCode: 'CODE1234' },
      });
    });

    it('should throw ForbiddenException if course is CLOSED', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 1n,
        courseCode: 'CODE1234',
        status: CourseStatus.CLOSED,
      });

      await expect(service.joinCourse(studentId, courseCode)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if course is ARCHIVED', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 1n,
        courseCode: 'CODE1234',
        status: CourseStatus.ARCHIVED,
      });

      await expect(service.joinCourse(studentId, courseCode)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if student is already an ACTIVE member', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 1n,
        courseCode: 'CODE1234',
        status: CourseStatus.ACTIVE,
      });
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 100n,
        courseId: 1n,
        studentId,
        status: EnrollmentStatus.ACTIVE,
      });

      await expect(service.joinCourse(studentId, courseCode)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reactivate enrollment if student was previously REMOVED', async () => {
      const mockCourse = {
        id: 1n,
        courseCode: 'CODE1234',
        status: CourseStatus.ACTIVE,
      };
      const existingEnrollment = {
        id: 100n,
        courseId: 1n,
        studentId,
        status: EnrollmentStatus.REMOVED,
        removedAt: new Date(),
      };
      const updatedEnrollment = {
        ...existingEnrollment,
        status: EnrollmentStatus.ACTIVE,
        removedAt: null,
      };

      prisma.course.findUnique.mockResolvedValue(mockCourse);
      prisma.enrollment.findUnique.mockResolvedValue(existingEnrollment);
      prisma.enrollment.update.mockResolvedValue(updatedEnrollment);

      const result = await service.joinCourse(studentId, courseCode);

      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: 100n },
        data: expect.objectContaining({
          status: EnrollmentStatus.ACTIVE,
          removedAt: null,
        }),
      });
      expect(result.isReactivated).toBe(true);
      expect(result.course).toEqual(mockCourse);
      expect(result.enrollment).toEqual(updatedEnrollment);
    });

    it('should create new enrollment when student joins for the first time', async () => {
      const mockCourse = {
        id: 1n,
        courseCode: 'CODE1234',
        status: CourseStatus.ACTIVE,
      };
      const newEnrollment = {
        id: 200n,
        courseId: 1n,
        studentId,
        status: EnrollmentStatus.ACTIVE,
      };

      prisma.course.findUnique.mockResolvedValue(mockCourse);
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue(newEnrollment);

      const result = await service.joinCourse(studentId, '  code1234  ');

      expect(prisma.course.findUnique).toHaveBeenCalledWith({
        where: { courseCode: 'CODE1234' },
      });
      expect(prisma.enrollment.create).toHaveBeenCalledWith({
        data: {
          courseId: 1n,
          studentId,
          status: EnrollmentStatus.ACTIVE,
        },
      });
      expect(result.isReactivated).toBe(false);
      expect(result.course).toEqual(mockCourse);
      expect(result.enrollment).toEqual(newEnrollment);
    });
  });
});

