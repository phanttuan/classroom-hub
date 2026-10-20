import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { QuestionBankService } from './question-bank.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  QuestionStatus,
  QuestionType,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

describe('QuestionBankService', () => {
  let service: QuestionBankService;
  let prisma: {
    questionBank: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
    questionSet: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const teacherId = 10n;
  const setId = 9n;
  const questionId = 700n;
  const questionKey = '11111111-1111-1111-1111-111111111111';

  const baseQuestion = {
    id: questionId,
    ownerId: teacherId,
    setId,
    questionKey,
    content: 'Câu hỏi mẫu?',
    questionType: QuestionType.SINGLE,
    defaultScore: new Prisma.Decimal(1),
    version: 1,
    status: QuestionStatus.ACTIVE,
    createdAt: new Date('2026-10-20T00:00:00.000Z'),
    updatedAt: new Date('2026-10-20T00:00:00.000Z'),
    choices: [
      { id: 1n, content: 'Đáp án A', isCorrect: true, orderIndex: 1 },
      { id: 2n, content: 'Đáp án B', isCorrect: false, orderIndex: 2 },
    ],
    set: { id: setId, name: 'Bộ A' },
    _count: { quizQuestions: 2 },
  };

  beforeEach(() => {
    prisma = {
      questionBank: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn(),
      },
      questionSet: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: typeof prisma) => Promise<unknown>) =>
        cb(prisma),
      ),
    };
    service = new QuestionBankService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('chỉ lấy câu ACTIVE và lọc theo bộ câu hỏi', async () => {
      prisma.questionBank.findMany.mockResolvedValue([baseQuestion]);

      const result = await service.findAll(
        teacherId,
        '  mẫu  ',
        'single',
        '9',
        false,
      );

      expect(prisma.questionBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ownerId: teacherId,
            status: QuestionStatus.ACTIVE,
            content: { contains: 'mẫu', mode: 'insensitive' },
            questionType: QuestionType.SINGLE,
            setId,
          },
        }),
      );
      expect(result[0]).toMatchObject({
        id: '700',
        setId: '9',
        setName: 'Bộ A',
        usageCount: 2,
      });
    });

    it('lọc câu chưa phân bộ bằng setId = null', async () => {
      prisma.questionBank.findMany.mockResolvedValue([]);

      await service.findAll(teacherId, undefined, undefined, undefined, true);

      expect(prisma.questionBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ownerId: teacherId,
            status: QuestionStatus.ACTIVE,
            setId: null,
          },
        }),
      );
    });

    it('không cho lọc đồng thời setId và unfiled', async () => {
      await expect(
        service.findAll(teacherId, undefined, undefined, '9', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối loại câu hỏi không hợp lệ', async () => {
      await expect(
        service.findAll(teacherId, undefined, 'ESSAY'),
      ).rejects.toThrow('Loại câu hỏi không hợp lệ');
    });
  });

  describe('findOne', () => {
    it('trả 404 khi câu hỏi thuộc giáo viên khác (chống IDOR)', async () => {
      prisma.questionBank.findFirst.mockResolvedValue(null);

      await expect(service.findOne(teacherId, questionId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.questionBank.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: questionId, ownerId: teacherId },
        }),
      );
    });
  });

  describe('create', () => {
    const payload = {
      content: ' Câu hỏi mới? ',
      questionType: QuestionType.SINGLE,
      choices: [
        { content: ' Đúng ', isCorrect: true },
        { content: 'Sai', isCorrect: false },
      ],
    };

    it('từ chối setId thuộc giáo viên khác', async () => {
      prisma.questionSet.findFirst.mockResolvedValue(null);

      await expect(
        service.create(teacherId, { ...payload, setId: '9' }),
      ).rejects.toThrow('Bộ câu hỏi không tồn tại hoặc không thuộc về bạn');
      expect(prisma.questionBank.create).not.toHaveBeenCalled();
    });

    it('tạo câu hỏi trong bộ và trim nội dung', async () => {
      prisma.questionSet.findFirst.mockResolvedValue({ id: setId });
      prisma.questionBank.create.mockResolvedValue(baseQuestion);

      const result = await service.create(teacherId, {
        ...payload,
        setId: '9',
      });

      expect(prisma.questionBank.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: teacherId,
            setId,
            content: 'Câu hỏi mới?',
          }),
        }),
      );
      expect(result.id).toBe('700');
    });

    it('từ chối câu SINGLE có nhiều hơn một đáp án đúng', async () => {
      await expect(
        service.create(teacherId, {
          ...payload,
          choices: [
            { content: 'A', isCorrect: true },
            { content: 'B', isCorrect: true },
          ],
        }),
      ).rejects.toThrow(
        'Câu hỏi một đáp án chỉ được có đúng một lựa chọn đúng',
      );
    });

    it('từ chối câu MULTIPLE có ít hơn hai đáp án đúng', async () => {
      await expect(
        service.create(teacherId, {
          ...payload,
          questionType: QuestionType.MULTIPLE,
        }),
      ).rejects.toThrow(
        'Câu hỏi nhiều đáp án phải có ít nhất hai lựa chọn đúng',
      );
    });
  });

  describe('update', () => {
    it('chỉ đổi bộ câu hỏi thì cập nhật trực tiếp, không tạo phiên bản', async () => {
      prisma.questionBank.findFirst.mockResolvedValue({
        ...baseQuestion,
        setId: null,
        set: null,
        _count: { quizQuestions: 0 },
      });
      prisma.questionSet.findFirst.mockResolvedValue({ id: setId });
      prisma.questionBank.update.mockResolvedValue({
        ...baseQuestion,
        setId,
        set: { id: setId, name: 'Bộ A' },
      });

      const result = await service.update(teacherId, questionId, {
        setId: '9',
      });

      expect(prisma.questionBank.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: questionId },
          data: { set: { connect: { id: setId } } },
        }),
      );
      expect(prisma.questionBank.create).not.toHaveBeenCalled();
      expect(result.version).toBe(1);
      expect(result.setId).toBe('9');
    });

    it('câu đã dùng nhưng chỉ đổi bộ: update in-place dù client gửi lại nội dung', async () => {
      prisma.questionBank.findFirst.mockResolvedValue({
        ...baseQuestion,
        setId: null,
        set: null,
        _count: { quizQuestions: 1 },
      });
      prisma.questionSet.findFirst.mockResolvedValue({ id: setId });
      prisma.questionBank.update.mockResolvedValue({
        ...baseQuestion,
        version: 1,
        setId,
      });

      const result = await service.update(teacherId, questionId, {
        content: baseQuestion.content,
        questionType: QuestionType.SINGLE,
        defaultScore: 1,
        setId: '9',
        choices: baseQuestion.choices.map((choice) => ({
          content: choice.content,
          isCorrect: choice.isCorrect,
        })),
      });

      expect(prisma.questionBank.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            set: { connect: { id: setId } },
            defaultScore: expect.anything(),
          }),
        }),
      );
      expect(prisma.questionBank.aggregate).not.toHaveBeenCalled();
      expect(prisma.questionBank.create).not.toHaveBeenCalled();
      expect(result.version).toBe(1);
    });

    it('chuyển câu hỏi về chưa phân bộ bằng setId = null', async () => {
      prisma.questionBank.findFirst.mockResolvedValue({
        ...baseQuestion,
        _count: { quizQuestions: 0 },
      });
      prisma.questionBank.update.mockResolvedValue({
        ...baseQuestion,
        setId: null,
        set: null,
      });

      await service.update(teacherId, questionId, { setId: null });

      expect(prisma.questionBank.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { set: { disconnect: true } },
        }),
      );
    });

    it('câu chưa được dùng: sửa nội dung trực tiếp và thay toàn bộ lựa chọn', async () => {
      prisma.questionBank.findFirst.mockResolvedValue({
        ...baseQuestion,
        _count: { quizQuestions: 0 },
      });
      prisma.questionBank.update.mockResolvedValue({
        ...baseQuestion,
        content: 'Nội dung mới',
        setId: null,
        set: null,
      });

      await service.update(teacherId, questionId, {
        content: ' Nội dung mới ',
        setId: null,
        choices: [
          { content: 'A', isCorrect: true },
          { content: 'B', isCorrect: false },
        ],
      });

      expect(prisma.questionBank.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: questionId },
          data: expect.objectContaining({
            content: 'Nội dung mới',
            set: { disconnect: true },
            choices: expect.objectContaining({
              deleteMany: {},
              create: [
                { content: 'A', isCorrect: true, orderIndex: 1 },
                { content: 'B', isCorrect: false, orderIndex: 2 },
              ],
            }),
          }),
        }),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('câu đã được quiz dùng: tạo version mới và giữ setId cũ', async () => {
      prisma.questionBank.findFirst.mockResolvedValue({
        ...baseQuestion,
        _count: { quizQuestions: 1 },
      });
      prisma.questionBank.aggregate.mockResolvedValue({
        _max: { version: 3 },
      });
      prisma.questionBank.update.mockResolvedValue({
        ...baseQuestion,
        status: QuestionStatus.RETIRED,
      });
      prisma.questionBank.create.mockResolvedValue({
        ...baseQuestion,
        id: 900n,
        content: 'Nội dung mới',
        version: 4,
        _count: { quizQuestions: 0 },
      });

      const result = await service.update(teacherId, questionId, {
        content: 'Nội dung mới',
        setId: null,
      });

      expect(prisma.questionBank.update).toHaveBeenCalledWith({
        where: { id: questionId },
        data: { status: QuestionStatus.RETIRED },
      });
      expect(prisma.questionBank.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            questionKey,
            setId,
            content: 'Nội dung mới',
            version: 4,
            status: QuestionStatus.ACTIVE,
          }),
        }),
      );
      expect(result).toMatchObject({
        id: '900',
        version: 4,
        setId: '9',
        usageCount: 0,
      });
    });

    it('trả 404 khi sửa câu hỏi của giáo viên khác', async () => {
      prisma.questionBank.findFirst.mockResolvedValue(null);

      await expect(
        service.update(teacherId, questionId, { content: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('xóa mềm câu hỏi bằng trạng thái RETIRED', async () => {
      prisma.questionBank.findFirst.mockResolvedValue({ id: questionId });
      prisma.questionBank.update.mockResolvedValue({ id: questionId });

      const result = await service.remove(teacherId, questionId);

      expect(prisma.questionBank.update).toHaveBeenCalledWith({
        where: { id: questionId },
        data: { status: QuestionStatus.RETIRED },
        select: { id: true },
      });
      expect(result).toEqual({ id: '700' });
    });

    it('trả 404 khi xóa câu hỏi của giáo viên khác', async () => {
      prisma.questionBank.findFirst.mockResolvedValue(null);

      await expect(service.remove(teacherId, questionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('question sets', () => {
    it('đếm số câu ACTIVE trong từng bộ', async () => {
      prisma.questionSet.findMany.mockResolvedValue([
        {
          id: setId,
          ownerId: teacherId,
          name: 'Bộ A',
          createdAt: new Date('2026-10-20T00:00:00.000Z'),
          updatedAt: new Date('2026-10-20T00:00:00.000Z'),
          questions: [
            { status: QuestionStatus.ACTIVE },
            { status: QuestionStatus.RETIRED },
            { status: QuestionStatus.ACTIVE },
          ],
        },
      ]);

      const result = await service.findSets(teacherId);

      expect(result[0]).toMatchObject({ name: 'Bộ A', questionCount: 2 });
    });

    it('từ chối tạo bộ trùng tên', async () => {
      prisma.questionSet.findFirst.mockResolvedValue({ id: setId });

      await expect(
        service.createSet(teacherId, { name: 'Bộ A' }),
      ).rejects.toThrow('Tên bộ câu hỏi đã tồn tại');
      expect(prisma.questionSet.create).not.toHaveBeenCalled();
    });

    it('tạo bộ câu hỏi mới', async () => {
      prisma.questionSet.findFirst.mockResolvedValue(null);
      prisma.questionSet.create.mockResolvedValue({
        id: setId,
        ownerId: teacherId,
        name: 'Bộ A',
        createdAt: new Date('2026-10-20T00:00:00.000Z'),
        updatedAt: new Date('2026-10-20T00:00:00.000Z'),
        questions: [],
      });

      const result = await service.createSet(teacherId, { name: ' Bộ A ' });

      expect(prisma.questionSet.create).toHaveBeenCalledWith({
        data: { ownerId: teacherId, name: 'Bộ A' },
        include: { questions: { select: { status: true } } },
      });
      expect(result).toMatchObject({ id: '9', name: 'Bộ A', questionCount: 0 });
    });

    it('trả 404 khi đổi tên bộ của giáo viên khác', async () => {
      prisma.questionSet.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSet(teacherId, setId, { name: 'Mới' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('từ chối đổi tên trùng với bộ khác', async () => {
      prisma.questionSet.findFirst
        .mockResolvedValueOnce({ id: setId })
        .mockResolvedValueOnce({ id: 99n });

      await expect(
        service.updateSet(teacherId, setId, { name: 'Bộ B' }),
      ).rejects.toThrow('Tên bộ câu hỏi đã tồn tại');
    });

    it('xóa bộ câu hỏi của chính giáo viên', async () => {
      prisma.questionSet.findFirst.mockResolvedValue({ id: setId });
      prisma.questionSet.delete.mockResolvedValue({ id: setId });

      const result = await service.removeSet(teacherId, setId);

      expect(prisma.questionSet.delete).toHaveBeenCalledWith({
        where: { id: setId },
      });
      expect(result).toEqual({ id: '9' });
    });

    it('trả 404 khi xóa bộ của giáo viên khác', async () => {
      prisma.questionSet.findFirst.mockResolvedValue(null);

      await expect(service.removeSet(teacherId, setId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
