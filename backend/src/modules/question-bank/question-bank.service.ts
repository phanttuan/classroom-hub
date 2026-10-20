import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { QuestionType } from '../../generated/prisma/enums.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';

function formatScore(val: Prisma.Decimal | number | string): string {
  if (typeof val === 'object' && 'toFixed' in val) return val.toFixed(2);
  const num = Number(val);
  return Number.isNaN(num) ? '0.00' : num.toFixed(2);
}

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách câu hỏi trong ngân hàng của chính giáo viên (CH-105) */
  async findAll(
    ownerId: bigint,
    search?: string,
    questionType?: string,
  ) {
    const where: Prisma.QuestionBankWhereInput = { ownerId };

    if (search?.trim()) {
      where.content = { contains: search.trim(), mode: 'insensitive' };
    }

    if (questionType?.trim()) {
      const upper = questionType.trim().toUpperCase();
      if (!Object.values(QuestionType).includes(upper as QuestionType)) {
        throw new BadRequestException('Loại câu hỏi không hợp lệ');
      }
      where.questionType = upper as QuestionType;
    }

    const questions = await this.prisma.questionBank.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { choices: { orderBy: { orderIndex: 'asc' } } },
    });

    return questions.map((question) => this.formatQuestion(question));
  }

  /** Tạo câu hỏi mới trong ngân hàng của giáo viên */
  async create(ownerId: bigint, dto: CreateQuestionDto) {
    const choices = dto.choices.map((choice) => ({
      content: choice.content.trim(),
      isCorrect: choice.isCorrect,
    }));

    const correctCount = choices.filter((choice) => choice.isCorrect).length;
    if (correctCount === 0) {
      throw new BadRequestException(
        'Câu hỏi phải có ít nhất một lựa chọn đúng',
      );
    }
    if (dto.questionType === QuestionType.SINGLE && correctCount !== 1) {
      throw new BadRequestException(
        'Câu hỏi một đáp án chỉ được có đúng một lựa chọn đúng',
      );
    }
    if (dto.questionType === QuestionType.MULTIPLE && correctCount < 2) {
      throw new BadRequestException(
        'Câu hỏi nhiều đáp án phải có ít nhất hai lựa chọn đúng',
      );
    }

    const question = await this.prisma.questionBank.create({
      data: {
        ownerId,
        content: dto.content.trim(),
        questionType: dto.questionType,
        defaultScore: new Prisma.Decimal(dto.defaultScore ?? 1),
        choices: {
          create: choices.map((choice, index) => ({
            content: choice.content,
            isCorrect: choice.isCorrect,
            orderIndex: index + 1,
          })),
        },
      },
      include: { choices: { orderBy: { orderIndex: 'asc' } } },
    });

    return this.formatQuestion(question);
  }

  private formatQuestion(question: {
    id: bigint;
    ownerId: bigint;
    questionKey: string;
    content: string;
    questionType: QuestionType;
    defaultScore: Prisma.Decimal | number | string;
    version: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    choices: Array<{
      id: bigint;
      content: string;
      isCorrect: boolean;
      orderIndex: number;
    }>;
  }) {
    return {
      id: question.id.toString(),
      ownerId: question.ownerId.toString(),
      questionKey: question.questionKey,
      content: question.content,
      questionType: question.questionType,
      defaultScore: formatScore(question.defaultScore),
      version: question.version,
      status: question.status,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      choices: question.choices.map((choice) => ({
        id: choice.id.toString(),
        content: choice.content,
        isCorrect: choice.isCorrect,
        orderIndex: choice.orderIndex,
      })),
    };
  }
}
