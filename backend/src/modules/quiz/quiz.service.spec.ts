import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QuizService } from './quiz.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ActivityStatus,
  AttemptStatus,
  GradeCategory,
  QuestionType,
  UserRole,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

describe('QuizService', () => {
  let service: QuizService;
  let prisma: {
    quiz: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    quizQuestion: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
    questionBank: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    gradeItem: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    module: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const teacherId = 10n;
  const otherTeacherId = 11n;
  const studentId = 20n;
  const courseId = 1n;
  const moduleId = 50n;
  const quizId = 100n;
  const gradeItemId = 500n;

  const baseQuiz = {
    id: quizId,
    courseId,
    moduleId,
    createdBy: teacherId,
    title: 'Kiểm tra 1',
    instructions: 'Làm bài nghiêm túc',
    openAt: new Date('2026-11-01T08:00:00.000Z'),
    dueAt: new Date('2026-11-05T23:59:59.000Z'),
    durationMinutes: 45,
    maxAttempts: 1,
    scoringEnabled: true,
    showAnswersAfterSubmit: false,
    status: ActivityStatus.DRAFT,
    publishedAt: null,
    createdAt: new Date('2026-10-20T00:00:00.000Z'),
    updatedAt: new Date('2026-10-20T00:00:00.000Z'),
  };

  const baseQuestion = {
    id: 700n,
    quizId,
    questionId: 105n,
    orderIndex: 1,
    maxScore: new Prisma.Decimal(2.5),
    questionSnapshot: {
      content: 'Câu hỏi mẫu?',
      choices: [
        { id: '1', content: 'Đáp án A', isCorrect: true, orderIndex: 1 },
        { id: '2', content: 'Đáp án B', isCorrect: false, orderIndex: 2 },
      ],
    },
    createdAt: new Date('2026-10-20T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      quiz: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      quizQuestion: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _max: { orderIndex: null } }),
      },
      questionBank: {
        findUnique: vi.fn(),
      },
      gradeItem: {
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      module: {
        findUnique: vi.fn().mockResolvedValue({ id: moduleId, courseId }),
      },
      $transaction: vi.fn(async (cb: (tx: typeof prisma) => Promise<unknown>) =>
        cb(prisma),
      ),
    };
    service = new QuizService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should throw BadRequestException when dueAt <= openAt', async () => {
      await expect(
        service.create(teacherId, courseId, {
          moduleId: '50',
          title: 'Đề lỗi thời gian',
          openAt: '2026-11-05T08:00:00.000Z',
          dueAt: '2026-11-01T08:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when module belongs to another course', async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: moduleId,
        courseId: 999n,
      });

      await expect(
        service.create(teacherId, courseId, {
          moduleId: '50',
          title: 'Đề kiểm tra 1',
          openAt: '2026-11-01T08:00:00.000Z',
          dueAt: '2026-11-05T23:59:59.000Z',
        }),
      ).rejects.toThrow(
        'Topic (moduleId) không tồn tại hoặc không thuộc khóa học này',
      );
    });

    it('should create quiz and GradeItem with maxScore 0 in one transaction when scoring is enabled', async () => {
      prisma.quiz.create.mockResolvedValue(baseQuiz);
      prisma.gradeItem.create.mockResolvedValue({
        id: gradeItemId,
        courseId,
        category: GradeCategory.QUIZ,
        quizId,
        maxScore: new Prisma.Decimal(0),
      });

      const result = await service.create(teacherId, courseId, {
        moduleId: '50',
        title: '  Kiểm tra 1  ',
        instructions: 'Làm bài nghiêm túc',
        openAt: '2026-11-01T08:00:00.000Z',
        dueAt: '2026-11-05T23:59:59.000Z',
        durationMinutes: 45,
        maxAttempts: 1,
        scoringEnabled: true,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.quiz.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          courseId,
          moduleId,
          createdBy: teacherId,
          title: 'Kiểm tra 1',
          scoringEnabled: true,
          status: ActivityStatus.DRAFT,
        }),
      });
      expect(prisma.gradeItem.create).toHaveBeenCalledWith({
        data: {
          courseId,
          category: GradeCategory.QUIZ,
          quizId,
          maxScore: new Prisma.Decimal(0),
        },
      });
      expect(result).toMatchObject({
        id: '100',
        courseId: '1',
        moduleId: '50',
        gradeItemId: '500',
        totalMaxScore: '0.00',
        questionCount: 0,
        status: ActivityStatus.DRAFT,
      });
    });

    it('should NOT create GradeItem when scoringEnabled is false', async () => {
      prisma.quiz.create.mockResolvedValue({
        ...baseQuiz,
        scoringEnabled: false,
      });

      const result = await service.create(teacherId, courseId, {
        moduleId: '50',
        title: 'Bài khảo sát',
        openAt: '2026-11-01T08:00:00.000Z',
        dueAt: '2026-11-05T23:59:59.000Z',
        scoringEnabled: false,
      });

      expect(prisma.gradeItem.create).not.toHaveBeenCalled();
      expect(result.gradeItemId).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when quiz is not in the course', async () => {
      prisma.quiz.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(courseId, quizId, {
          id: teacherId,
          role: UserRole.TEACHER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when student views DRAFT quiz', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        gradeItem: null,
        quizQuestions: [],
      });

      await expect(
        service.findOne(courseId, quizId, {
          id: studentId,
          role: UserRole.STUDENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should NOT return questions for student (anti answer-leak)', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        status: ActivityStatus.PUBLISHED,
        gradeItem: { id: gradeItemId },
        quizQuestions: [{ maxScore: new Prisma.Decimal(2.5) }],
      });

      const result = await service.findOne(courseId, quizId, {
        id: studentId,
        role: UserRole.STUDENT,
      });

      expect(result).not.toHaveProperty('questions');
      expect(JSON.stringify(result)).not.toContain('isCorrect');
      expect(result.questionCount).toBe(1);
      expect(result.totalMaxScore).toBe('2.50');
      // Không truy vấn snapshot câu hỏi cho học sinh
      expect(prisma.quizQuestion.findMany).not.toHaveBeenCalled();
    });

    it('should return full questions with isCorrect for the course teacher', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        gradeItem: { id: gradeItemId },
        quizQuestions: [{ maxScore: new Prisma.Decimal(2.5) }],
      });
      prisma.quizQuestion.findMany.mockResolvedValue([baseQuestion]);

      const result = await service.findOne(courseId, quizId, {
        id: teacherId,
        role: UserRole.TEACHER,
      });

      expect(result.questions).toHaveLength(1);
      expect(JSON.stringify(result)).toContain('"isCorrect":true');
      expect(result.questions?.[0]).toMatchObject({
        id: '700',
        questionId: '105',
        maxScore: '2.50',
      });
    });
  });

  describe('update', () => {
    it('should throw ConflictException (409) when quiz is PUBLISHED/CLOSED', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        status: ActivityStatus.PUBLISHED,
        gradeItem: { id: gradeItemId },
      });

      await expect(
        service.update(teacherId, courseId, quizId, { title: 'Sửa' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.quiz.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when moving quiz to a module of another course', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        gradeItem: { id: gradeItemId },
      });
      prisma.module.findUnique.mockResolvedValue({
        id: 99n,
        courseId: 999n,
      });

      await expect(
        service.update(teacherId, courseId, quizId, { moduleId: '99' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update DRAFT quiz and allow moving to another module in the same course', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        gradeItem: { id: gradeItemId },
      });
      prisma.module.findUnique.mockResolvedValue({ id: 51n, courseId });
      prisma.quiz.update.mockResolvedValue({
        ...baseQuiz,
        moduleId: 51n,
      });

      const result = await service.update(teacherId, courseId, quizId, {
        moduleId: '51',
      });

      expect(prisma.quiz.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: quizId },
          data: { module: { connect: { id: 51n } } },
        }),
      );
      expect(result.moduleId).toBe('51');
    });
  });

  describe('publish', () => {
    it('should throw BadRequestException when quiz has no questions', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        gradeItem: null,
      });
      prisma.quizQuestion.findMany.mockResolvedValue([]);

      await expect(service.publish(courseId, quizId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should publish and freeze total score (10.00) into GradeItem', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        gradeItem: { id: gradeItemId },
      });
      prisma.quizQuestion.findMany.mockResolvedValue([
        { maxScore: new Prisma.Decimal(4) },
        { maxScore: new Prisma.Decimal(3) },
        { maxScore: new Prisma.Decimal(3) },
      ]);
      prisma.quiz.update.mockResolvedValue({
        ...baseQuiz,
        status: ActivityStatus.PUBLISHED,
        publishedAt: new Date(),
        gradeItem: { id: gradeItemId },
      });
      prisma.gradeItem.upsert.mockResolvedValue({ id: gradeItemId });

      const result = await service.publish(courseId, quizId);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.quiz.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: quizId },
          data: expect.objectContaining({ status: ActivityStatus.PUBLISHED }),
        }),
      );
      expect(prisma.gradeItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { quizId },
          update: { maxScore: new Prisma.Decimal(10) },
        }),
      );
      expect(result.status).toBe(ActivityStatus.PUBLISHED);
      expect(result.totalMaxScore).toBe('10.00');
      expect(result.questionCount).toBe(3);
    });
  });

  describe('close', () => {
    it('should throw ConflictException when closing DRAFT quiz', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        gradeItem: null,
        quizQuestions: [],
      });

      await expect(service.close(courseId, quizId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should close a PUBLISHED quiz', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...baseQuiz,
        status: ActivityStatus.PUBLISHED,
        gradeItem: { id: gradeItemId },
        quizQuestions: [{ maxScore: new Prisma.Decimal(5) }],
      });
      prisma.quiz.update.mockResolvedValue({
        ...baseQuiz,
        status: ActivityStatus.CLOSED,
        gradeItem: { id: gradeItemId },
      });

      const result = await service.close(courseId, quizId);

      expect(result.status).toBe(ActivityStatus.CLOSED);
      expect(result.totalMaxScore).toBe('5.00');
    });
  });

  describe('remove', () => {
    it('should delete a DRAFT quiz', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.DRAFT,
      });
      prisma.quiz.delete.mockResolvedValue({ id: quizId });

      const result = await service.remove(courseId, quizId);

      expect(prisma.quiz.delete).toHaveBeenCalledWith({
        where: { id: quizId },
      });
      expect(result.id).toBe('100');
    });

    it('should throw ConflictException when deleting PUBLISHED quiz', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.PUBLISHED,
      });

      await expect(service.remove(courseId, quizId)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.quiz.delete).not.toHaveBeenCalled();
    });
  });

  describe('addQuestion', () => {
    const bankQuestion = {
      id: 105n,
      ownerId: teacherId,
      questionKey: '00000000-0000-0000-0000-000000000105',
      content: 'Câu hỏi mẫu?',
      questionType: QuestionType.SINGLE,
      defaultScore: new Prisma.Decimal(1),
      version: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      choices: [
        { id: 1n, content: 'A', isCorrect: true, orderIndex: 1 },
        { id: 2n, content: 'B', isCorrect: false, orderIndex: 2 },
      ],
    };

    it('should throw ForbiddenException (403) when using another teacher question (IDOR)', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.DRAFT,
      });
      prisma.questionBank.findUnique.mockResolvedValue({
        ...bankQuestion,
        ownerId: otherTeacherId,
      });

      await expect(
        service.addQuestion(teacherId, courseId, quizId, {
          questionId: '105',
          maxScore: 2,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when question already exists in quiz', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.DRAFT,
      });
      prisma.questionBank.findUnique.mockResolvedValue(bankQuestion);
      prisma.quizQuestion.findUnique.mockResolvedValue(baseQuestion);

      await expect(
        service.addQuestion(teacherId, courseId, quizId, {
          questionId: '105',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
    });

    it('should snapshot the question and use defaultScore when maxScore omitted', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.DRAFT,
      });
      prisma.questionBank.findUnique.mockResolvedValue(bankQuestion);
      prisma.quizQuestion.findUnique.mockResolvedValue(null);
      prisma.quizQuestion.aggregate.mockResolvedValue({
        _max: { orderIndex: 2 },
      });
      prisma.quizQuestion.create.mockResolvedValue({
        ...baseQuestion,
        orderIndex: 3,
        maxScore: new Prisma.Decimal(1),
      });

      const result = await service.addQuestion(
        teacherId,
        courseId,
        quizId,
        { questionId: '105' },
      );

      expect(prisma.quizQuestion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quizId,
          questionId: 105n,
          orderIndex: 3,
          maxScore: new Prisma.Decimal(1),
          questionSnapshot: expect.objectContaining({
            content: 'Câu hỏi mẫu?',
            choices: expect.arrayContaining([
              expect.objectContaining({ content: 'A', isCorrect: true }),
            ]),
          }),
        }),
      });
      expect(result.orderIndex).toBe(3);
    });

    it('should throw ConflictException when quiz is not DRAFT', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.PUBLISHED,
      });

      await expect(
        service.addQuestion(teacherId, courseId, quizId, {
          questionId: '105',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('question score management', () => {
    it('should update maxScore for a quiz question in DRAFT', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.DRAFT,
      });
      prisma.quizQuestion.findFirst.mockResolvedValue(baseQuestion);
      prisma.quizQuestion.update.mockResolvedValue({
        ...baseQuestion,
        maxScore: new Prisma.Decimal(3),
      });

      const result = await service.updateQuestion(courseId, quizId, 700n, {
        maxScore: 3,
      });

      expect(prisma.quizQuestion.update).toHaveBeenCalledWith({
        where: { id: 700n },
        data: { maxScore: new Prisma.Decimal(3) },
      });
      expect(result.maxScore).toBe('3.00');
    });

    it('should remove a question from a DRAFT quiz', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.DRAFT,
      });
      prisma.quizQuestion.findFirst.mockResolvedValue(baseQuestion);

      const result = await service.removeQuestion(courseId, quizId, 700n);

      expect(prisma.quizQuestion.delete).toHaveBeenCalledWith({
        where: { id: 700n },
      });
      expect(result.id).toBe('700');
    });

    it('should lock question editing after publish', async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        id: quizId,
        status: ActivityStatus.PUBLISHED,
      });

      await expect(
        service.updateQuestion(courseId, quizId, 700n, { maxScore: 5 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should hide DRAFT quizzes from students', async () => {
      prisma.quiz.findMany.mockResolvedValue([
        {
          ...baseQuiz,
          status: ActivityStatus.PUBLISHED,
          gradeItem: { id: gradeItemId },
          quizQuestions: [{ maxScore: new Prisma.Decimal(5) }],
        },
      ]);

      const result = await service.findAll(courseId, {
        id: studentId,
        role: UserRole.STUDENT,
      });

      expect(prisma.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            courseId,
            status: {
              in: [ActivityStatus.PUBLISHED, ActivityStatus.CLOSED],
            },
          },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('questions');
    });

    it('should return every quiz plus attempt stats for teacher', async () => {
      prisma.quiz.findMany.mockResolvedValue([
        {
          ...baseQuiz,
          gradeItem: { id: gradeItemId },
          quizQuestions: [
            { maxScore: new Prisma.Decimal(5) },
            { maxScore: new Prisma.Decimal(5) },
          ],
          attempts: [
            { status: AttemptStatus.SUBMITTED },
            { status: AttemptStatus.IN_PROGRESS },
          ],
        },
      ]);

      const result = await service.findAll(
        courseId,
        { id: teacherId, role: UserRole.TEACHER },
        'DRAFT',
      );

      expect(prisma.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { courseId, status: ActivityStatus.DRAFT },
        }),
      );
      expect(result[0]?.attemptStats).toEqual({ submitted: 1, total: 2 });
      expect(result[0]?.totalMaxScore).toBe('10.00');
      expect(result[0]?.questionCount).toBe(2);
    });

    it('should reject invalid status filter', async () => {
      await expect(
        service.findAll(courseId, {
          id: teacherId,
          role: UserRole.TEACHER,
        }, 'INVALID'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
