import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCourseDto } from './create-course.dto.js';
import { UpdateCourseDto } from './update-course.dto.js';
import { UpdateCourseStatusDto } from './update-course-status.dto.js';
import { JoinCourseDto } from './join-course.dto.js';
import { CourseStatus } from '../../../generated/prisma/enums.js';

describe('Course DTOs Validation', () => {
  describe('CreateCourseDto', () => {
    it('should pass with valid name and optional description', async () => {
      const dto = plainToInstance(CreateCourseDto, {
        name: 'Lập trình Web nâng cao',
        description: 'Mô tả khóa học',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when name is empty', async () => {
      const dto = plainToInstance(CreateCourseDto, {
        name: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when name exceeds 255 characters', async () => {
      const dto = plainToInstance(CreateCourseDto, {
        name: 'A'.repeat(256),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when description exceeds 2000 characters', async () => {
      const dto = plainToInstance(CreateCourseDto, {
        name: 'Toán học',
        description: 'B'.repeat(2001),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateCourseDto', () => {
    it('should pass when updating only description', async () => {
      const dto = plainToInstance(UpdateCourseDto, {
        description: 'Mô tả mới',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when updating both name and description', async () => {
      const dto = plainToInstance(UpdateCourseDto, {
        name: 'Tên khóa học mới',
        description: 'Mô tả mới',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when name is empty string', async () => {
      const dto = plainToInstance(UpdateCourseDto, {
        name: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateCourseStatusDto', () => {
    it('should pass with valid CourseStatus enum', async () => {
      const dto = plainToInstance(UpdateCourseStatusDto, {
        status: CourseStatus.CLOSED,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid CourseStatus', async () => {
      const dto = plainToInstance(UpdateCourseStatusDto, {
        status: 'UNKNOWN_STATUS',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('JoinCourseDto', () => {
    it('should pass with valid 8-character uppercase course code', async () => {
      const dto = plainToInstance(JoinCourseDto, {
        courseCode: 'ABCDEFGH',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.courseCode).toBe('ABCDEFGH');
    });

    it('should automatically trim and uppercase input course code', async () => {
      const dto = plainToInstance(JoinCourseDto, {
        courseCode: '  abcdefgh  ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.courseCode).toBe('ABCDEFGH');
    });

    it('should fail when code is shorter than 6 characters', async () => {
      const dto = plainToInstance(JoinCourseDto, {
        courseCode: 'ABC',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when code contains special characters', async () => {
      const dto = plainToInstance(JoinCourseDto, {
        courseCode: 'ABC@#123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

