import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto.js';
import { UpdateQuestionDto } from './update-question.dto.js';
import { CreateQuestionSetDto } from './create-question-set.dto.js';
import { UpdateQuestionSetDto } from './update-question-set.dto.js';
import { QuestionType } from '../../../generated/prisma/enums.js';

describe('Question Bank DTOs Validation', () => {
  describe('CreateQuestionSetDto', () => {
    it('chấp nhận tên hợp lệ và tự động trim', async () => {
      const dto = plainToInstance(CreateQuestionSetDto, {
        name: '  Chương 1 - Mạng máy tính  ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.name).toBe('Chương 1 - Mạng máy tính');
    });

    it('từ chối khi tên để trống hoặc chỉ có khoảng trắng', async () => {
      const dto = plainToInstance(CreateQuestionSetDto, {
        name: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('từ chối khi tên vượt quá 255 ký tự', async () => {
      const dto = plainToInstance(CreateQuestionSetDto, {
        name: 'A'.repeat(256),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });
  });

  describe('UpdateQuestionSetDto', () => {
    it('chấp nhận tên hợp lệ', async () => {
      const dto = plainToInstance(UpdateQuestionSetDto, {
        name: 'Chương 2 - Định tuyến IP',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('từ chối khi tên để trống', async () => {
      const dto = plainToInstance(UpdateQuestionSetDto, {
        name: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateQuestionDto', () => {
    const validQuestion = {
      content: 'Giao thức nào hoạt động ở tầng Transport?',
      questionType: QuestionType.SINGLE,
      defaultScore: 1.5,
      setId: '12',
      choices: [
        { content: 'TCP', isCorrect: true },
        { content: 'IP', isCorrect: false },
      ],
    };

    it('chấp nhận câu hỏi hợp lệ có setId', async () => {
      const dto = plainToInstance(CreateQuestionDto, validQuestion);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('chấp nhận câu hỏi hợp lệ không có setId (chưa phân bộ)', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        ...validQuestion,
        setId: undefined,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('từ chối setId không phải số dương', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        ...validQuestion,
        setId: 'abc',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'setId')).toBe(true);
    });

    it('từ chối điểm mặc định nhỏ hơn 0.01', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        ...validQuestion,
        defaultScore: 0,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'defaultScore')).toBe(true);
    });

    it('từ chối khi danh sách lựa chọn có ít hơn 2 phần tử', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        ...validQuestion,
        choices: [{ content: 'Chỉ 1 đáp án', isCorrect: true }],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'choices')).toBe(true);
    });
  });

  describe('UpdateQuestionDto', () => {
    it('chấp nhận cập nhật với setId là số', async () => {
      const dto = plainToInstance(UpdateQuestionDto, {
        setId: '25',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('chấp nhận setId = null để chuyển về Chưa phân bộ', async () => {
      const dto = plainToInstance(UpdateQuestionDto, {
        setId: null,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('từ chối setId không hợp lệ', async () => {
      const dto = plainToInstance(UpdateQuestionDto, {
        setId: '-5',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'setId')).toBe(true);
    });
  });
});
