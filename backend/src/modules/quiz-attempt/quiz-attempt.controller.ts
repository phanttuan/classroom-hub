import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CourseMemberGuard } from '../../common/guards/course-member.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithCourseContext } from '../../common/interfaces/request-with-user.interface.js';
import { QuizAttemptService } from './quiz-attempt.service.js';
import { SaveAnswersDto, SubmitAttemptDto } from './dto/save-answers.dto.js';

function parseId(raw: string, label: string): bigint {
  const trimmed = (raw ?? '').trim();
  if (!/^[1-9]\d*$/.test(trimmed)) throw new BadRequestException(`Mã ${label} không hợp lệ`);
  return BigInt(trimmed);
}

/**
 * Lượt làm bài trắc nghiệm.
 * CourseMemberGuard: sinh viên phải có Enrollment ACTIVE; giáo viên phải phụ trách khóa học; admin toàn quyền.
 */
@UseGuards(JwtAuthGuard, RolesGuard, CourseMemberGuard)
@Controller('courses/:courseId/quizzes/:quizId')
export class QuizAttemptController {
  constructor(private readonly attempts: QuizAttemptService) {}

  /** Các lượt của chính sinh viên + cửa sổ làm bài (khai báo trước :attemptId) */
  @Get('attempts/me')
  @Roles(UserRole.STUDENT)
  async myAttempts(@Req() req: RequestWithCourseContext, @Param('quizId') quizIdParam: string) {
    const data = await this.attempts.getMyAttempts(req.course!.id, parseId(quizIdParam, 'đề kiểm tra'), BigInt(req.user!.id));
    return { message: 'Lấy lượt làm bài thành công', data };
  }

  /** Bảng lượt làm bài theo sinh viên (giáo viên phụ trách / admin) */
  @Get('attempts')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async listAttempts(@Req() req: RequestWithCourseContext, @Param('quizId') quizIdParam: string) {
    const data = await this.attempts.listForTeacher(req.course!.id, parseId(quizIdParam, 'đề kiểm tra'));
    return { message: 'Lấy danh sách lượt làm bài thành công', data };
  }

  /** Bắt đầu lượt mới (hoặc trả lại lượt đang dở) */
  @Post('attempts')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  async start(@Req() req: RequestWithCourseContext, @Param('quizId') quizIdParam: string) {
    const data = await this.attempts.start(req.course!.id, parseId(quizIdParam, 'đề kiểm tra'), BigInt(req.user!.id));
    return { message: 'Bắt đầu làm bài', data };
  }

  /** Lượt đang làm (tiếp tục) hoặc kết quả nếu đã nộp */
  @Get('attempts/:attemptId')
  @Roles(UserRole.STUDENT)
  async getAttempt(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
    @Param('attemptId') attemptIdParam: string,
  ) {
    const data = await this.attempts.getAttempt(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra'),
      parseId(attemptIdParam, 'lượt làm bài'),
      BigInt(req.user!.id),
    );
    return { message: 'Lấy lượt làm bài thành công', data };
  }

  /** Lưu nháp đáp án */
  @Patch('attempts/:attemptId/answers')
  @Roles(UserRole.STUDENT)
  async saveAnswers(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
    @Param('attemptId') attemptIdParam: string,
    @Body() dto: SaveAnswersDto,
  ) {
    const data = await this.attempts.saveAnswers(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra'),
      parseId(attemptIdParam, 'lượt làm bài'),
      BigInt(req.user!.id),
      dto.answers,
    );
    return { message: 'Đã lưu đáp án', data };
  }

  /** Nộp bài — chấm tự động ngay */
  @Post('attempts/:attemptId/submit')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  async submit(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
    @Param('attemptId') attemptIdParam: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    const data = await this.attempts.submit(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra'),
      parseId(attemptIdParam, 'lượt làm bài'),
      BigInt(req.user!.id),
      dto,
    );
    return { message: 'Nộp bài thành công', data };
  }

  /** Kết quả một lượt — chủ lượt, hoặc giáo viên phụ trách / admin */
  @Get('attempts/:attemptId/result')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  async result(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
    @Param('attemptId') attemptIdParam: string,
  ) {
    const data = await this.attempts.getResult(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra'),
      parseId(attemptIdParam, 'lượt làm bài'),
      { id: BigInt(req.user!.id), role: req.user!.role as UserRole },
    );
    return { message: 'Lấy kết quả thành công', data };
  }
}
