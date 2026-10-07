import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateClassDto } from './create-class.dto.js';
import { UpdateClassDto } from './update-class.dto.js';
import { UpdateClassStatusDto } from './update-class-status.dto.js';
import { JoinClassDto } from './join-class.dto.js';
import { ClassStatus } from '../../../generated/prisma/enums.js';

describe('Class DTOs Validation', () => {
  describe('CreateClassDto', () => {
    it('should pass with valid name and optional description', async () => {
      const dto = plainToInstance(CreateClassDto, {
        name: 'Lập trình Web nâng cao',
        description: 'Mô tả lớp học',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when name is empty', async () => {
      const dto = plainToInstance(CreateClassDto, {
        name: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when name exceeds 255 characters', async () => {
      const dto = plainToInstance(CreateClassDto, {
        name: 'A'.repeat(256),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when description exceeds 2000 characters', async () => {
      const dto = plainToInstance(CreateClassDto, {
        name: 'Toán học',
        description: 'B'.repeat(2001),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateClassDto', () => {
    it('should pass when updating only description', async () => {
      const dto = plainToInstance(UpdateClassDto, {
        description: 'Mô tả mới',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when updating both name and description', async () => {
      const dto = plainToInstance(UpdateClassDto, {
        name: 'Tên lớp mới',
        description: 'Mô tả mới',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when name is empty string', async () => {
      const dto = plainToInstance(UpdateClassDto, {
        name: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateClassStatusDto', () => {
    it('should pass with valid ClassStatus enum value', async () => {
      const dto = plainToInstance(UpdateClassStatusDto, {
        status: ClassStatus.CLOSED,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid status value', async () => {
      const dto = plainToInstance(UpdateClassStatusDto, {
        status: 'INVALID_STATUS',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('JoinClassDto', () => {
    it('should pass with valid 8-character uppercase class code', async () => {
      const dto = plainToInstance(JoinClassDto, {
        classCode: 'ABCDEF12',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.classCode).toBe('ABCDEF12');
    });

    it('should trim and uppercase class code automatically', async () => {
      const dto = plainToInstance(JoinClassDto, {
        classCode: '  abcdef12  ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.classCode).toBe('ABCDEF12');
    });

    it('should fail when class code is empty', async () => {
      const dto = plainToInstance(JoinClassDto, {
        classCode: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when class code contains invalid characters like dashes or symbols', async () => {
      const dto = plainToInstance(JoinClassDto, {
        classCode: 'ABC-1234',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when class code is too short (less than 6 chars)', async () => {
      const dto = plainToInstance(JoinClassDto, {
        classCode: 'ABC12',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

