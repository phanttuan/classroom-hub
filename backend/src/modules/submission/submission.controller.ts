/// <reference types="multer" />
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CourseMemberGuard } from '../../common/guards/course-member.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithCourseContext } from '../../common/interfaces/request-with-user.interface.js';
import {
  LESSON_FILES_STORAGE,
  MULTER_HARD_LIMIT_BYTES,
} from '../resource/resource-upload.service.js';
import { SubmissionService } from './submission.service.js';
import { UpsertSubmissionDto } from './dto/upsert-submission.dto.js';

function parseId(raw: string, label: string): bigint {
  const trimmed = (raw ?? '').trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new BadRequestException(`${label} không hợp lệ`);
  }
  return BigInt(trimmed);
}

/**
 * Bài nộp của bài tập.
 * CourseMemberGuard: sinh viên phải có Enrollment ACTIVE; giáo viên phải phụ trách khóa học; admin toàn quyền.
 */
@UseGuards(JwtAuthGuard, RolesGuard, CourseMemberGuard)
@Controller('courses/:courseId/assignments/:assignmentId')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  /** Bài nộp của chính sinh viên (kèm cửa sổ nộp + quy tắc tệp) */
  @Get('submission')
  @Roles(UserRole.STUDENT)
  async getMySubmission(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
  ) {
    const data = await this.submissionService.getMySubmission(
      req.course!.id,
      parseId(assignmentIdParam, 'Mã bài tập (assignmentId)'),
      BigInt(req.user!.id),
    );
    return { message: 'Lấy bài nộp thành công', data };
  }

  /** Nộp bài / chỉnh sửa bài nộp — multipart: `content` (HTML), `file` (1 tệp), `removeFile` */
  @Put('submission')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  // Tệp ghi tạm ra đĩa rồi stream lên Cloudinary; giới hạn thật (UPLOAD_MAX_FILE_MB) kiểm tra trong service
  @UseInterceptors(
    FileInterceptor('file', {
      storage: LESSON_FILES_STORAGE,
      limits: { fileSize: MULTER_HARD_LIMIT_BYTES, files: 1 },
    }),
  )
  async upsertSubmission(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
    @Body() dto: UpsertSubmissionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data = await this.submissionService.upsert(
      req.course!.id,
      parseId(assignmentIdParam, 'Mã bài tập (assignmentId)'),
      BigInt(req.user!.id),
      dto,
      file,
    );
    return { message: 'Nộp bài thành công', data };
  }

  /** Loại bỏ bài nộp — trở về trạng thái chưa nộp */
  @Delete('submission')
  @Roles(UserRole.STUDENT)
  async removeSubmission(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
  ) {
    return this.submissionService.remove(
      req.course!.id,
      parseId(assignmentIdParam, 'Mã bài tập (assignmentId)'),
      BigInt(req.user!.id),
    );
  }

  /** Danh sách bài nộp theo sinh viên (giáo viên phụ trách / admin) */
  @Get('submissions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async listSubmissions(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
  ) {
    const data = await this.submissionService.listForTeacher(
      req.course!.id,
      parseId(assignmentIdParam, 'Mã bài tập (assignmentId)'),
    );
    return { message: 'Lấy danh sách bài nộp thành công', data };
  }

  /** Chi tiết một bài nộp (giáo viên phụ trách / admin) */
  @Get('submissions/:submissionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getSubmission(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
    @Param('submissionId') submissionIdParam: string,
  ) {
    const data = await this.submissionService.getOneForTeacher(
      req.course!.id,
      parseId(assignmentIdParam, 'Mã bài tập (assignmentId)'),
      parseId(submissionIdParam, 'Mã bài nộp (submissionId)'),
    );
    return { message: 'Lấy chi tiết bài nộp thành công', data };
  }
}
