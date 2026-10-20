import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QuestionBankService } from './question-bank.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  /** Câu hỏi thuộc ngân hàng của chính giáo viên đang đăng nhập */
  @Get()
  async listQuestions(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('questionType') questionType?: string,
  ) {
    const data = await this.questionBankService.findAll(
      BigInt(req.user!.id),
      search,
      questionType,
    );
    return { message: 'Lấy ngân hàng câu hỏi thành công', data };
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
}
