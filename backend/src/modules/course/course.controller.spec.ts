import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CourseController } from './course.controller.js';
import { CourseService } from './course.service.js';
import { UserRole, CourseStatus } from '../../generated/prisma/enums.js';
import type {
  RequestWithUser,
  RequestWithCourseContext,
} from '../../common/interfaces/request-with-user.interface.js';

describe('CourseController', () => {
  let controller: CourseController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findTeacherCourses: ReturnType<typeof vi.fn>;
    findStudentCourses: ReturnType<typeof vi.fn>;
    findAllCourses: ReturnType<typeof vi.fn>;
    joinCourse: ReturnType<typeof vi.fn>;
    findMembers: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      create: vi.fn(),
      update: vi.fn(),
      changeStatus: vi.fn(),
      findOne: vi.fn(),
      findTeacherCourses: vi.fn(),
      findStudentCourses: vi.fn(),
      findAllCourses: vi.fn(),
      joinCourse: vi.fn(),
      findMembers: vi.fn(),
    };
    controller = new CourseController(service as unknown as CourseService);
  });

  describe('createCourse', () => {
    it('should call service.create with teacherId and dto', async () => {
      const req = {
        user: { id: '10', role: UserRole.TEACHER, email: 't@school.edu.vn' },
      } as RequestWithUser;
      const dto = { name: 'Môn Tin học', description: 'Mô tả' };
      const expectedResult = { id: 1n, name: dto.name, courseCode: 'CODE1234' };

      service.create.mockResolvedValue(expectedResult);

      const result = await controller.createCourse(req, dto);
      expect(service.create).toHaveBeenCalledWith(10n, dto);
      expect(result).toEqual({
        message: 'Tạo lớp học thành công',
        data: expectedResult,
      });
    });
  });

  describe('updateCourse', () => {
    it('should call service.update with courseId and dto', async () => {
      const course = { id: 1n, name: 'Cũ' } as any;
      const req = {
        course,
        user: { id: '10', role: UserRole.TEACHER },
      } as RequestWithCourseContext;
      const dto = { name: 'Mới' };
      const updated = { id: 1n, name: 'Mới' };

      service.update.mockResolvedValue(updated);

      const result = await controller.updateCourse(req, dto);
      expect(service.update).toHaveBeenCalledWith(1n, dto);
      expect(result).toEqual({
        message: 'Cập nhật thông tin lớp học thành công',
        data: updated,
      });
    });
  });

  describe('updateCourseStatus', () => {
    it('should call service.changeStatus with courseId and status dto', async () => {
      const course = { id: 1n, status: CourseStatus.ACTIVE } as any;
      const req = {
        course,
        user: { id: '10', role: UserRole.TEACHER },
      } as RequestWithCourseContext;
      const dto = { status: CourseStatus.CLOSED };
      const updated = { id: 1n, status: CourseStatus.CLOSED };

      service.changeStatus.mockResolvedValue(updated);

      const result = await controller.updateCourseStatus(req, dto);
      expect(service.changeStatus).toHaveBeenCalledWith(1n, dto);
      expect(result).toEqual({
        message: 'Cập nhật trạng thái lớp học thành công',
        data: updated,
      });
    });
  });

  describe('getCourseDetail', () => {
    it('should call service.findOne with courseId', async () => {
      const course = { id: 1n, name: 'Môn 1' } as any;
      const req = {
        course,
        user: { id: '10', role: UserRole.TEACHER },
      } as RequestWithCourseContext;

      service.findOne.mockResolvedValue(course);

      const result = await controller.getCourseDetail(req);
      expect(service.findOne).toHaveBeenCalledWith(1n);
      expect(result).toEqual(course);
    });
  });

  describe('getCourseMembers', () => {
    it('should call service.findMembers with courseId', async () => {
      const course = { id: 1n, name: 'Môn 1' } as any;
      const req = {
        course,
        user: { id: '10', role: UserRole.TEACHER },
      } as RequestWithCourseContext;
      const members = { owner: { id: 10n, fullName: 'Thầy A' }, students: [] };

      service.findMembers.mockResolvedValue(members);

      const result = await controller.getCourseMembers(req);
      expect(service.findMembers).toHaveBeenCalledWith(1n);
      expect(result).toEqual(members);
    });
  });

  describe('listCourses', () => {
    it('should call service.findTeacherCourses when user is TEACHER', async () => {
      const req = {
        user: { id: '10', role: UserRole.TEACHER, email: 't@school.edu.vn' },
      } as RequestWithUser;

      const mockList = { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findTeacherCourses.mockResolvedValue(mockList);

      const result = await controller.listCourses(req, 'ACTIVE', 'Web', '1', '10');
      expect(service.findTeacherCourses).toHaveBeenCalledWith(10n, {
        status: 'ACTIVE',
        search: 'Web',
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockList);
    });

    it('should call service.findStudentCourses when user is STUDENT', async () => {
      const req = {
        user: { id: '20', role: UserRole.STUDENT, email: 's@school.edu.vn' },
      } as RequestWithUser;

      const mockList = { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findStudentCourses.mockResolvedValue(mockList);

      const result = await controller.listCourses(req, 'ACTIVE', 'Web', '1', '10');
      expect(service.findStudentCourses).toHaveBeenCalledWith(20n, {
        status: 'ACTIVE',
        search: 'Web',
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockList);
    });

    it('should call service.findAllCourses when user is ADMIN', async () => {
      const req = {
        user: { id: '1', role: UserRole.ADMIN, email: 'admin@school.edu.vn' },
      } as RequestWithUser;

      const mockList = { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findAllCourses.mockResolvedValue(mockList);

      const result = await controller.listCourses(req, 'ACTIVE', 'Web', '1', '10');
      expect(service.findAllCourses).toHaveBeenCalledWith({
        status: 'ACTIVE',
        search: 'Web',
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('joinCourse', () => {
    it('should call service.joinCourse with studentId and courseCode', async () => {
      const req = {
        user: { id: '20', role: UserRole.STUDENT, email: 's@school.edu.vn' },
      } as RequestWithUser;
      const dto = { courseCode: 'CODE1234' };
      const course = { id: 1n, name: 'Môn Tin', courseCode: 'CODE1234' };

      service.joinCourse.mockResolvedValue({
        course,
        enrollment: { id: 100n },
        isReactivated: false,
      });

      const result = await controller.joinCourse(req, dto);
      expect(service.joinCourse).toHaveBeenCalledWith(20n, 'CODE1234');
      expect(result).toEqual({
        message: 'Tham gia lớp học thành công',
        data: course,
      });
    });

    it('should show reactivation message if enrollment was previously removed', async () => {
      const req = {
        user: { id: '20', role: UserRole.STUDENT, email: 's@school.edu.vn' },
      } as RequestWithUser;
      const dto = { courseCode: 'CODE1234' };
      const course = { id: 1n, name: 'Môn Tin', courseCode: 'CODE1234' };

      service.joinCourse.mockResolvedValue({
        course,
        enrollment: { id: 100n },
        isReactivated: true,
      });

      const result = await controller.joinCourse(req, dto);
      expect(result.message).toContain('Lịch sử học tập trước đó đã được khôi phục');
    });
  });
});

