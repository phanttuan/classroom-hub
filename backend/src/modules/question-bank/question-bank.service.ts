import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  QuestionStatus,
  QuestionType,
} from '../../generated/prisma/enums.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { CreateQuestionSetDto } from './dto/create-question-set.dto.js';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto.js';

function formatScore(val: Prisma.Decimal | number | string): string {
  if (typeof val === 'object' && 'toFixed' in val) return val.toFixed(2);
  const num = Number(val);
  return Number.isNaN(num) ? '0.00' : num.toFixed(2);
}

function parsePositiveId(raw: string, label: string): bigint {
  if (!/^[1-9]\d*$/.test(raw.trim())) {
    throw new BadRequestException(`${label} không hợp lệ`);
  }
  return BigInt(raw.trim());
}

interface QuestionChoiceRecord {
  id: bigint;
  content: string;
  isCorrect: boolean;
  orderIndex: number;
}

interface QuestionRecord {
  id: bigint;
  ownerId: bigint;
  setId: bigint | null;
  questionKey: string;
  content: string;
  questionType: QuestionType;
  defaultScore: Prisma.Decimal | number | string;
  version: number;
  status: QuestionStatus;
  createdAt: Date;
  updatedAt: Date;
  choices: QuestionChoiceRecord[];
  set?: { id: bigint; name: string } | null;
  _count?: { quizQuestions: number };
}

interface ChoiceInput {
  content: string;
  isCorrect: boolean;
}

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách câu hỏi ACTIVE trong ngân hàng của chính giáo viên (CH-105) */
  async findAll(
    ownerId: bigint,
    search?: string,
    questionType?: string,
    setId?: string,
    unfiled?: boolean,
  ) {
    if (setId?.trim() && unfiled === true) {
      throw new BadRequestException(
        'Không thể lọc đồng thời theo bộ câu hỏi và câu hỏi chưa phân bộ',
      );
    }

    const where: Prisma.QuestionBankWhereInput = {
      ownerId,
      status: QuestionStatus.ACTIVE,
    };

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

    if (setId?.trim()) {
      where.setId = parsePositiveId(setId, 'Mã bộ câu hỏi (setId)');
    } else if (unfiled === true) {
      where.setId = null;
    }

    const questions = await this.prisma.questionBank.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.questionInclude(),
    });

    return questions.map((question) => this.formatQuestion(question));
  }

  /** Chi tiết một câu hỏi — chỉ chủ sở hữu mới đọc được (chống IDOR) */
  async findOne(ownerId: bigint, id: bigint) {
    const question = await this.prisma.questionBank.findFirst({
      where: { id, ownerId },
      include: this.questionInclude(),
    });

    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi trong ngân hàng');
    }

    return this.formatQuestion(question);
  }

  /** Tạo câu hỏi mới trong ngân hàng của giáo viên */
  async create(ownerId: bigint, dto: CreateQuestionDto) {
    let setId: bigint | null = null;
    if (dto.setId !== undefined) {
      setId = parsePositiveId(dto.setId, 'Mã bộ câu hỏi (setId)');
      await this.assertSetOwned(ownerId, setId);
    }

    const choices = this.validateChoices(dto.questionType, dto.choices);

    const question = await this.prisma.questionBank.create({
      data: {
        ownerId,
        setId,
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
      include: this.questionInclude(),
    });

    return this.formatQuestion(question);
  }

  /**
   * Cập nhật câu hỏi.
   * - Chỉ đổi bộ/điểm: cập nhật trực tiếp.
   * - Đổi nội dung khi câu hỏi chưa được dùng: cập nhật trực tiếp.
   * - Đổi nội dung khi câu hỏi đã được dùng: tạo phiên bản mới, bản cũ chuyển RETIRED.
   */
  async update(ownerId: bigint, id: bigint, dto: UpdateQuestionDto) {
    const existing = await this.prisma.questionBank.findFirst({
      where: { id, ownerId },
      include: {
        choices: { orderBy: { orderIndex: 'asc' } },
        set: { select: { id: true, name: true } },
        _count: { select: { quizQuestions: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy câu hỏi trong ngân hàng');
    }

    let nextSetId = existing.setId;
    let setChanged = false;
    if (dto.setId !== undefined) {
      setChanged = true;
      if (dto.setId === null) {
        nextSetId = null;
      } else {
        nextSetId = parsePositiveId(dto.setId, 'Mã bộ câu hỏi (setId)');
        await this.assertSetOwned(ownerId, nextSetId);
      }
    }

    const nextContent =
      dto.content !== undefined ? dto.content.trim() : existing.content;
    if (!nextContent) {
      throw new BadRequestException('Nội dung câu hỏi không được để trống');
    }

    const nextType = dto.questionType ?? existing.questionType;
    const nextChoices = this.validateChoices(
      nextType,
      dto.choices ??
        existing.choices.map((choice) => ({
          content: choice.content,
          isCorrect: choice.isCorrect,
        })),
    );

    // So sánh giá trị thật, không chỉ sự có mặt của field: frontend luôn gửi đủ
    // nội dung/đáp án khi sửa, nên chỉ đổi bộ câu hỏi vẫn phải là update in-place.
    const contentChanged =
      nextContent !== existing.content ||
      nextType !== existing.questionType ||
      !this.choicesEqual(nextChoices, existing.choices);

    // Chỉ đổi bộ câu hỏi / điểm mặc định: không tạo phiên bản mới.
    if (!contentChanged) {
      if (!setChanged && dto.defaultScore === undefined) {
        return this.formatQuestion(existing);
      }

      const updated = await this.prisma.questionBank.update({
        where: { id: existing.id },
        data: {
          ...(setChanged
            ? {
                set:
                  nextSetId === null
                    ? { disconnect: true }
                    : { connect: { id: nextSetId } },
              }
            : {}),
          ...(dto.defaultScore !== undefined
            ? { defaultScore: new Prisma.Decimal(dto.defaultScore) }
            : {}),
        },
        include: this.questionInclude(),
      });

      return this.formatQuestion(updated);
    }

    const usedByQuiz = (existing._count?.quizQuestions ?? 0) > 0;

    if (!usedByQuiz) {
      const updated = await this.prisma.questionBank.update({
        where: { id: existing.id },
        data: {
          content: nextContent,
          questionType: nextType,
          ...(setChanged
            ? {
                set:
                  nextSetId === null
                    ? { disconnect: true }
                    : { connect: { id: nextSetId } },
              }
            : {}),
          ...(dto.defaultScore !== undefined
            ? { defaultScore: new Prisma.Decimal(dto.defaultScore) }
            : {}),
          choices: {
            deleteMany: {},
            create: nextChoices.map((choice, index) => ({
              content: choice.content,
              isCorrect: choice.isCorrect,
              orderIndex: index + 1,
            })),
          },
        },
        include: this.questionInclude(),
      });

      return this.formatQuestion(updated);
    }

    // Câu hỏi đã nằm trong ít nhất một quiz: giữ nguyên bản cũ cho snapshot,
    // tạo bản mới cùng questionKey để các quiz đã tạo không bị đổi nội dung.
    const created = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.questionBank.aggregate({
        where: { questionKey: existing.questionKey, ownerId },
        _max: { version: true },
      });

      await tx.questionBank.update({
        where: { id: existing.id },
        data: { status: QuestionStatus.RETIRED },
      });

      return tx.questionBank.create({
        data: {
          ownerId,
          questionKey: existing.questionKey,
          setId: existing.setId,
          content: nextContent,
          questionType: nextType,
          defaultScore:
            dto.defaultScore !== undefined
              ? new Prisma.Decimal(dto.defaultScore)
              : existing.defaultScore,
          version: (latest._max.version ?? existing.version) + 1,
          status: QuestionStatus.ACTIVE,
          choices: {
            create: nextChoices.map((choice, index) => ({
              content: choice.content,
              isCorrect: choice.isCorrect,
              orderIndex: index + 1,
            })),
          },
        },
        include: this.questionInclude(),
      });
    });

    return this.formatQuestion(created);
  }

  /** Xóa mềm: câu hỏi chuyển RETIRED để không làm hỏng quiz đã dùng nó */
  async remove(ownerId: bigint, id: bigint) {
    const existing = await this.prisma.questionBank.findFirst({
      where: { id, ownerId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy câu hỏi trong ngân hàng');
    }

    const removed = await this.prisma.questionBank.update({
      where: { id: existing.id },
      data: { status: QuestionStatus.RETIRED },
      select: { id: true },
    });

    return { id: removed.id.toString() };
  }

  /** Danh sách bộ câu hỏi kèm số câu hỏi ACTIVE */
  async findSets(ownerId: bigint) {
    const sets = await this.prisma.questionSet.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      include: { questions: { select: { status: true } } },
    });

    return sets.map((set) => this.formatSet(set));
  }

  async createSet(ownerId: bigint, dto: CreateQuestionSetDto) {
    const name = dto.name.trim();
    await this.assertSetNameAvailable(ownerId, name);

    try {
      const set = await this.prisma.questionSet.create({
        data: { ownerId, name },
        include: { questions: { select: { status: true } } },
      });
      return this.formatSet(set);
    } catch (error) {
      this.rethrowDuplicateSetName(error);
      throw error;
    }
  }

  async updateSet(
    ownerId: bigint,
    setId: bigint,
    dto: UpdateQuestionSetDto,
  ) {
    const existing = await this.prisma.questionSet.findFirst({
      where: { id: setId, ownerId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy bộ câu hỏi');
    }

    const name = dto.name.trim();
    await this.assertSetNameAvailable(ownerId, name, setId);

    try {
      const set = await this.prisma.questionSet.update({
        where: { id: existing.id },
        data: { name },
        include: { questions: { select: { status: true } } },
      });
      return this.formatSet(set);
    } catch (error) {
      this.rethrowDuplicateSetName(error);
      throw error;
    }
  }

  /** Xóa bộ câu hỏi; câu hỏi bên trong tự chuyển về "Chưa phân bộ" nhờ onDelete: SetNull */
  async removeSet(ownerId: bigint, setId: bigint) {
    const existing = await this.prisma.questionSet.findFirst({
      where: { id: setId, ownerId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy bộ câu hỏi');
    }

    await this.prisma.questionSet.delete({ where: { id: existing.id } });
    return { id: existing.id.toString() };
  }

  private questionInclude() {
    return {
      choices: { orderBy: { orderIndex: 'asc' as const } },
      set: { select: { id: true, name: true } },
      _count: { select: { quizQuestions: true } },
    };
  }

  private formatQuestion(question: QuestionRecord) {
    return {
      id: question.id.toString(),
      ownerId: question.ownerId.toString(),
      setId: question.setId?.toString() ?? null,
      setName: question.set?.name ?? null,
      questionKey: question.questionKey,
      content: question.content,
      questionType: question.questionType,
      defaultScore: formatScore(question.defaultScore),
      version: question.version,
      status: question.status,
      usageCount: question._count?.quizQuestions ?? 0,
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

  private formatSet(set: {
    id: bigint;
    ownerId: bigint;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    questions: Array<{ status: QuestionStatus }>;
  }) {
    return {
      id: set.id.toString(),
      ownerId: set.ownerId.toString(),
      name: set.name,
      questionCount: set.questions.filter(
        (question) => question.status === QuestionStatus.ACTIVE,
      ).length,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
    };
  }

  private choicesEqual(
    nextChoices: ChoiceInput[],
    existingChoices: QuestionChoiceRecord[],
  ): boolean {
    if (nextChoices.length !== existingChoices.length) return false;
    return nextChoices.every(
      (choice, index) =>
        choice.content === existingChoices[index].content &&
        choice.isCorrect === existingChoices[index].isCorrect,
    );
  }

  private validateChoices(
    questionType: QuestionType,
    choices: ChoiceInput[],
  ): ChoiceInput[] {
    const normalized = choices.map((choice) => ({
      content: choice.content.trim(),
      isCorrect: choice.isCorrect,
    }));

    if (normalized.some((choice) => !choice.content)) {
      throw new BadRequestException(
        'Nội dung lựa chọn không được để trống',
      );
    }

    const correctCount = normalized.filter((choice) => choice.isCorrect).length;
    if (correctCount === 0) {
      throw new BadRequestException(
        'Câu hỏi phải có ít nhất một lựa chọn đúng',
      );
    }
    if (questionType === QuestionType.SINGLE && correctCount !== 1) {
      throw new BadRequestException(
        'Câu hỏi một đáp án chỉ được có đúng một lựa chọn đúng',
      );
    }
    if (questionType === QuestionType.MULTIPLE && correctCount < 2) {
      throw new BadRequestException(
        'Câu hỏi nhiều đáp án phải có ít nhất hai lựa chọn đúng',
      );
    }

    return normalized;
  }

  private async assertSetOwned(ownerId: bigint, setId: bigint) {
    const set = await this.prisma.questionSet.findFirst({
      where: { id: setId, ownerId },
      select: { id: true },
    });

    if (!set) {
      throw new BadRequestException(
        'Bộ câu hỏi không tồn tại hoặc không thuộc về bạn',
      );
    }
  }

  private async assertSetNameAvailable(
    ownerId: bigint,
    name: string,
    exceptSetId?: bigint,
  ) {
    const duplicate = await this.prisma.questionSet.findFirst({
      where: {
        ownerId,
        name,
        ...(exceptSetId !== undefined
          ? { NOT: { id: exceptSetId } }
          : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('Tên bộ câu hỏi đã tồn tại');
    }
  }

  private rethrowDuplicateSetName(error: unknown) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    ) {
      throw new BadRequestException('Tên bộ câu hỏi đã tồn tại');
    }
  }
}
