import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QuestionBankService } from './question-bank.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { CreateQuestionSetDto } from './dto/create-question-set.dto.js';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface.js';

function parseId(raw: string, label: string): bigint {
  if (!/^[1-9]\d*$/.test(raw.trim())) {
    throw new BadRequestException(`${label} không hợp lệ`);
  }
  return BigInt(raw.trim());
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  // ==================== BỘ CÂU HỎI ====================
  // Các route tĩnh "sets" phải khai báo trước ":id" để không bị nuốt route.

  @Get('sets')
  async listSets(@Req() req: RequestWithUser) {
    const data = await this.questionBankService.findSets(
      BigInt(req.user!.id),
    );
    return { message: 'Lấy danh sách bộ câu hỏi thành công', data };
  }

  @Post('sets')
  @HttpCode(HttpStatus.CREATED)
  async createSet(
    @Req() req: RequestWithUser,
    @Body() dto: CreateQuestionSetDto,
  ) {
    const data = await this.questionBankService.createSet(
      BigInt(req.user!.id),
      dto,
    );
    return { message: 'Tạo bộ câu hỏi thành công', data };
  }

  @Patch('sets/:setId')
  async updateSet(
    @Req() req: RequestWithUser,
    @Param('setId') setId: string,
    @Body() dto: UpdateQuestionSetDto,
  ) {
    const data = await this.questionBankService.updateSet(
      BigInt(req.user!.id),
      parseId(setId, 'Mã bộ câu hỏi (setId)'),
      dto,
    );
    return { message: 'Đổi tên bộ câu hỏi thành công', data };
  }

  @Delete('sets/:setId')
  async removeSet(
    @Req() req: RequestWithUser,
    @Param('setId') setId: string,
  ) {
    const data = await this.questionBankService.removeSet(
      BigInt(req.user!.id),
      parseId(setId, 'Mã bộ câu hỏi (setId)'),
    );
    return { message: 'Xóa bộ câu hỏi thành công', data };
  }

  // ==================== CÂU HỎI ====================

  /** Câu hỏi thuộc ngân hàng của chính giáo viên đang đăng nhập */
  @Get()
  async listQuestions(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('questionType') questionType?: string,
    @Query('setId') setId?: string,
    @Query('unfiled') unfiled?: string,
  ) {
    const data = await this.questionBankService.findAll(
      BigInt(req.user!.id),
      search,
      questionType,
      setId,
      unfiled === 'true',
    );
    return { message: 'Lấy ngân hàng câu hỏi thành công', data };
  }

  @Get(':id')
  async getQuestion(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const data = await this.questionBankService.findOne(
      BigInt(req.user!.id),
      parseId(id, 'Mã câu hỏi'),
    );
    return { message: 'Lấy câu hỏi thành công', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @Req() req: RequestWithUser,
    @Body() dto: CreateQuestionDto,
  ) {
    const data = await this.questionBankService.create(
      BigInt(req.user!.id),
      dto,
    );
    return { message: 'Tạo câu hỏi thành công', data };
  }

  @Patch(':id')
  async updateQuestion(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    const data = await this.questionBankService.update(
      BigInt(req.user!.id),
      parseId(id, 'Mã câu hỏi'),
      dto,
    );
    return { message: 'Cập nhật câu hỏi thành công', data };
  }

  @Delete(':id')
  async removeQuestion(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const data = await this.questionBankService.remove(
      BigInt(req.user!.id),
      parseId(id, 'Mã câu hỏi'),
    );
    return { message: 'Xóa câu hỏi thành công', data };
  }
}
