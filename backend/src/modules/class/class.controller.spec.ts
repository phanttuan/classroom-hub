import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassController } from './class.controller.js';
import { ClassService } from './class.service.js';
import { UserRole, ClassStatus } from '../../generated/prisma/enums.js';
import type {
  RequestWithUser,
  RequestWithClassContext,
} from '../../common/interfaces/request-with-user.interface.js';

describe('ClassController', () => {
  let controller: ClassController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findTeacherClasses: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      create: vi.fn(),
      update: vi.fn(),
      changeStatus: vi.fn(),
      findOne: vi.fn(),
      findTeacherClasses: vi.fn(),
    };
    controller = new ClassController(service as unknown as ClassService);
  });

  describe('createClass', () => {
    it('should call service.create with teacherId and dto', async () => {
      const req = {
        user: { id: '10', role: UserRole.TEACHER, email: 't@school.edu.vn' },
      } as RequestWithUser;
      const dto = { name: 'Lớp Tin học', description: 'Mô tả' };
      const expectedResult = { id: 1n, name: dto.name, classCode: 'CODE1234' };

      service.create.mockResolvedValue(expectedResult);

      const result = await controller.createClass(req, dto);
      expect(service.create).toHaveBeenCalledWith(10n, dto);
      expect(result).toEqual({
        message: 'Tạo lớp học thành công',
        data: expectedResult,
      });
    });
  });

  describe('updateClass', () => {
    it('should call service.update with classId and dto', async () => {
      const classroom = { id: 1n, name: 'Cũ' } as any;
      const req = {
        classroom,
        user: { id: '10', role: UserRole.TEACHER },
      } as RequestWithClassContext;
      const dto = { name: 'Mới' };
      const updated = { id: 1n, name: 'Mới' };

      service.update.mockResolvedValue(updated);

      const result = await controller.updateClass(req, dto);
      expect(service.update).toHaveBeenCalledWith(1n, dto);
      expect(result).toEqual({
        message: 'Cập nhật thông tin lớp học thành công',
        data: updated,
      });
    });
  });

  describe('updateClassStatus', () => {
    it('should call service.changeStatus with classId and status dto', async () => {
      const classroom = { id: 1n, status: ClassStatus.ACTIVE } as any;
      const req = {
        classroom,
        user: { id: '10', role: UserRole.TEACHER },
      } as RequestWithClassContext;
      const dto = { status: ClassStatus.CLOSED };
      const updated = { id: 1n, status: ClassStatus.CLOSED };

      service.changeStatus.mockResolvedValue(updated);

      const result = await controller.updateClassStatus(req, dto);
      expect(service.changeStatus).toHaveBeenCalledWith(1n, dto);
      expect(result).toEqual({
        message: 'Cập nhật trạng thái lớp học thành công',
        data: updated,
      });
    });
  });

  describe('getClassDetail', () => {
    it('should call service.findOne with classId', async () => {
      const classroom = { id: 1n, name: 'Lớp 1' } as any;
      const req = {
        classroom,
        user: { id: '10', role: UserRole.TEACHER },
      } as RequestWithClassContext;

      service.findOne.mockResolvedValue(classroom);

      const result = await controller.getClassDetail(req);
      expect(service.findOne).toHaveBeenCalledWith(1n);
      expect(result).toEqual(classroom);
    });
  });

  describe('listClasses', () => {
    it('should call service.findTeacherClasses when user is TEACHER', async () => {
      const req = {
        user: { id: '10', role: UserRole.TEACHER, email: 't@school.edu.vn' },
      } as RequestWithUser;

      const mockList = { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findTeacherClasses.mockResolvedValue(mockList);

      const result = await controller.listClasses(req, 'ACTIVE', 'Web', '1', '10');
      expect(service.findTeacherClasses).toHaveBeenCalledWith(10n, {
        status: 'ACTIVE',
        search: 'Web',
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockList);
    });
  });
});

