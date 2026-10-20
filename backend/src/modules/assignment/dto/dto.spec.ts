import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAssignmentDto } from './create-assignment.dto.js';
import { UpdateAssignmentDto } from './update-assignment.dto.js';

describe('Assignment DTOs Validation', () => {
  describe('CreateAssignmentDto', () => {
    const validPayload = {
      moduleId: '10',
      title: 'Bài tập lớn số 1',
      description: 'Xây dựng REST API với NestJS',
      maxScore: 10,
      openAt: '2026-10-15T08:00:00.000Z',
      dueAt: '2026-10-25T23:59:59.000Z',
    };

    it('should pass with valid required and optional fields', async () => {
      const dto = plainToInstance(CreateAssignmentDto, validPayload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when moduleId is missing or invalid', async () => {
      const dtoMissing = plainToInstance(CreateAssignmentDto, {
        ...validPayload,
        moduleId: undefined,
      });
      const errorsMissing = await validate(dtoMissing);
      expect(errorsMissing.length).toBeGreaterThan(0);
      expect(errorsMissing.some((e) => e.property === 'moduleId')).toBe(true);

      const dtoInvalid = plainToInstance(CreateAssignmentDto, {
        ...validPayload,
        moduleId: 'abc',
      });
      const errorsInvalid = await validate(dtoInvalid);
      expect(errorsInvalid.length).toBeGreaterThan(0);
      expect(errorsInvalid.some((e) => e.property === 'moduleId')).toBe(true);
    });

    it('should fail when title is empty or whitespace only', async () => {
      const dto = plainToInstance(CreateAssignmentDto, {
        ...validPayload,
        title: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });

    it('should fail when title exceeds 255 characters', async () => {
      const dto = plainToInstance(CreateAssignmentDto, {
        ...validPayload,
        title: 'A'.repeat(256),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });

    it('should fail when maxScore is 0 or negative', async () => {
      const dtoZero = plainToInstance(CreateAssignmentDto, {
        ...validPayload,
        maxScore: 0,
      });
      const errorsZero = await validate(dtoZero);
      expect(errorsZero.length).toBeGreaterThan(0);
      expect(errorsZero.some((e) => e.property === 'maxScore')).toBe(true);

      const dtoNegative = plainToInstance(CreateAssignmentDto, {
        ...validPayload,
        maxScore: -5,
      });
      const errorsNegative = await validate(dtoNegative);
      expect(errorsNegative.length).toBeGreaterThan(0);
      expect(errorsNegative.some((e) => e.property === 'maxScore')).toBe(true);
    });

    it('should fail when openAt or dueAt has invalid date format', async () => {
      const dtoInvalidOpen = plainToInstance(CreateAssignmentDto, {
        ...validPayload,
        openAt: 'not-a-valid-date',
      });
      const errorsOpen = await validate(dtoInvalidOpen);
      expect(errorsOpen.length).toBeGreaterThan(0);
      expect(errorsOpen.some((e) => e.property === 'openAt')).toBe(true);

      const dtoInvalidDue = plainToInstance(CreateAssignmentDto, {
        ...validPayload,
        dueAt: '25/10/2026',
      });
      const errorsDue = await validate(dtoInvalidDue);
      expect(errorsDue.length).toBeGreaterThan(0);
      expect(errorsDue.some((e) => e.property === 'dueAt')).toBe(true);
    });
  });

  describe('UpdateAssignmentDto', () => {
    it('should pass when all fields are omitted', async () => {
      const dto = plainToInstance(UpdateAssignmentDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when updating only maxScore with valid number', async () => {
      const dto = plainToInstance(UpdateAssignmentDto, { maxScore: 20 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when provided maxScore is <= 0', async () => {
      const dto = plainToInstance(UpdateAssignmentDto, { maxScore: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'maxScore')).toBe(true);
    });

    it('should fail when provided title is empty', async () => {
      const dto = plainToInstance(UpdateAssignmentDto, { title: '   ' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });
  });
});

