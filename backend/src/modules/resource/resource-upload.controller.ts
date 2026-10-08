/// <reference types="multer" />
import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface.js';
import { MULTER_HARD_LIMIT_BYTES, ResourceUploadService } from './resource-upload.service.js';

function parseBigIntParam(value: string, name: string): bigint {
  if (!value || !/^[1-9]\d*$/.test(value.trim())) {
    throw new BadRequestException(`${name} không hợp lệ`);
  }
  return BigInt(value.trim());
}

function toUser(req: RequestWithUser) {
  return { id: BigInt(req.user!.id), role: req.user!.role as UserRole };
}

/** Upload / xóa tài liệu — chỉ giáo viên phụ trách môn học (hoặc admin) */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller()
export class ResourceUploadController {
  constructor(private readonly uploadService: ResourceUploadService) {}

  /** Tải tệp lên bài học FILE / FOLDER — multipart field `files` */
  @Post('lessons/:lessonId/resources')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: MULTER_HARD_LIMIT_BYTES } }))
  async uploadLessonFiles(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonIdParam: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const lessonId = parseBigIntParam(lessonIdParam, 'Mã bài học (lessonId)');
    const data = await this.uploadService.uploadLessonFiles(toUser(req), lessonId, files);
    return { message: 'Tải tệp lên thành công', data };
  }

  @Delete('resources/:resourceId')
  async deleteResource(@Req() req: RequestWithUser, @Param('resourceId') resourceIdParam: string) {
    const resourceId = parseBigIntParam(resourceIdParam, 'Mã tài liệu (resourceId)');
    return this.uploadService.deleteResource(toUser(req), resourceId);
  }

  /** Ảnh chèn trong trình soạn thảo — multipart field `file` */
  @Post('courses/:courseId/content-images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTER_HARD_LIMIT_BYTES } }))
  async uploadContentImage(
    @Req() req: RequestWithUser,
    @Param('courseId') courseIdParam: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const courseId = parseBigIntParam(courseIdParam, 'Mã lớp học (courseId)');
    const data = await this.uploadService.uploadContentImage(toUser(req), courseId, file);
    return { message: 'Tải ảnh lên thành công', data };
  }
}
