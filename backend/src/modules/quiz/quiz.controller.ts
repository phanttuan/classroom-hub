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
import { QuizService } from './quiz.service.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { AddQuizQuestionDto } from './dto/add-quiz-question.dto.js';
import { UpdateQuizQuestionDto } from './dto/update-quiz-question.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CourseOwnerGuard } from '../../common/guards/course-owner.guard.js';
import { CourseMemberGuard } from '../../common/guards/course-member.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithCourseContext } from '../../common/interfaces/request-with-user.interface.js';

function parseId(raw: string, label: string): bigint {
  const trimmed = (raw ?? '').trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new BadRequestException(`Mã ${label} không hợp lệ`);
  }
  return BigInt(trimmed);
}

@UseGuards(JwtAuthGuard)
@Controller('courses/:courseId/quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /** Tạo đề kiểm tra DRAFT (kèm GradeItem nếu bật chấm điểm) */
  @Post()
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async createQuiz(
    @Req() req: RequestWithCourseContext,
    @Body() dto: CreateQuizDto,
  ) {
    const data = await this.quizService.create(
      BigInt(req.user!.id),
      req.course!.id,
      dto,
    );
    return { message: 'Tạo đề kiểm tra thành công', data };
  }

  /** Danh sách đề kiểm tra trong khóa học */
  @Get()
  @UseGuards(CourseMemberGuard)
  async listQuizzes(
    @Req() req: RequestWithCourseContext,
    @Query('status') status?: string,
    @Query('moduleId') moduleId?: string,
  ) {
    const data = await this.quizService.findAll(
      req.course!.id,
      {
        id: BigInt(req.user!.id),
        role: req.user!.role as UserRole,
      },
      status,
      moduleId,
    );
    return { message: 'Lấy danh sách đề kiểm tra thành công', data };
  }

  /** Chi tiết đề kiểm tra (học sinh không nhận mảng câu hỏi/đáp án) */
  @Get(':quizId')
  @UseGuards(CourseMemberGuard)
  async getQuizDetail(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
  ) {
    const data = await this.quizService.findOne(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra (quizId)'),
      {
        id: BigInt(req.user!.id),
        role: req.user!.role as UserRole,
      },
    );
    return { message: 'Lấy chi tiết đề kiểm tra thành công', data };
  }

  /** Cập nhật cấu hình đề (chỉ DRAFT); hỗ trợ đổi moduleId khi kéo-thả topic */
  @Patch(':quizId')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  async updateQuiz(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
    @Body() dto: UpdateQuizDto,
  ) {
    const data = await this.quizService.update(
      BigInt(req.user!.id),
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra (quizId)'),
      dto,
    );
    return { message: 'Cập nhật đề kiểm tra thành công', data };
  }

  /** Xuất bản đề DRAFT → PUBLISHED (chốt tổng điểm vào sổ điểm) */
  @Post(':quizId/publish')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  async publishQuiz(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
  ) {
    const data = await this.quizService.publish(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra (quizId)'),
    );
    return { message: 'Xuất bản đề kiểm tra thành công', data };
  }

  /** Đóng đề PUBLISHED → CLOSED */
  @Post(':quizId/close')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  async closeQuiz(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
  ) {
    const data = await this.quizService.close(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra (quizId)'),
    );
    return { message: 'Đóng đề kiểm tra thành công', data };
  }

  /** Xóa đề kiểm tra (chỉ DRAFT) */
  @Delete(':quizId')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  async deleteQuiz(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
  ) {
    const data = await this.quizService.remove(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra (quizId)'),
    );
    return { message: 'Xóa đề kiểm tra thành công', data };
  }

  /** Thêm câu hỏi từ ngân hàng của giáo viên (chống IDOR) */
  @Post(':quizId/questions')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async addQuestion(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
    @Body() dto: AddQuizQuestionDto,
  ) {
    const data = await this.quizService.addQuestion(
      BigInt(req.user!.id),
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra (quizId)'),
      dto,
    );
    return { message: 'Thêm câu hỏi vào đề kiểm tra thành công', data };
  }

  /** Sửa điểm của câu hỏi trong đề (chỉ DRAFT) */
  @Patch(':quizId/questions/:quizQuestionId')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  async updateQuestion(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
    @Param('quizQuestionId') quizQuestionIdParam: string,
    @Body() dto: UpdateQuizQuestionDto,
  ) {
    const data = await this.quizService.updateQuestion(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra (quizId)'),
      parseId(quizQuestionIdParam, 'câu hỏi trong đề (quizQuestionId)'),
      dto,
    );
    return { message: 'Cập nhật điểm câu hỏi thành công', data };
  }

  /** Xóa câu hỏi khỏi đề (chỉ DRAFT) */
  @Delete(':quizId/questions/:quizQuestionId')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  async removeQuestion(
    @Req() req: RequestWithCourseContext,
    @Param('quizId') quizIdParam: string,
    @Param('quizQuestionId') quizQuestionIdParam: string,
  ) {
    const data = await this.quizService.removeQuestion(
      req.course!.id,
      parseId(quizIdParam, 'đề kiểm tra (quizId)'),
      parseId(quizQuestionIdParam, 'câu hỏi trong đề (quizQuestionId)'),
    );
    return { message: 'Xóa câu hỏi khỏi đề kiểm tra thành công', data };
  }
}
