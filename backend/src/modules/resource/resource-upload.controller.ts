/// <reference types="multer" />
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface.js';
import {
  CONTENT_IMAGE_MAX_BYTES,
  LESSON_FILES_STORAGE,
  MULTER_HARD_LIMIT_BYTES,
  ResourceUploadService,
} from './resource-upload.service.js';

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
  // Ghi tạm ra đĩa rồi stream lên Cloudinary — không giữ tệp lớn trong RAM
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: LESSON_FILES_STORAGE,
      limits: { fileSize: MULTER_HARD_LIMIT_BYTES },
    }),
  )
  async uploadLessonFiles(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonIdParam: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const lessonId = parseBigIntParam(lessonIdParam, 'Mã bài học (lessonId)');
    const data = await this.uploadService.uploadLessonFiles(
      toUser(req),
      lessonId,
      files,
    );
    return { message: 'Tải tệp lên thành công', data };
  }

  @Delete('resources/:resourceId')
  async deleteResource(
    @Req() req: RequestWithUser,
    @Param('resourceId') resourceIdParam: string,
  ) {
    const resourceId = parseBigIntParam(
      resourceIdParam,
      'Mã tài liệu (resourceId)',
    );
    return this.uploadService.deleteResource(toUser(req), resourceId);
  }

  /** Ảnh chèn trong trình soạn thảo — multipart field `file` */
  @Post('courses/:courseId/content-images')
  @HttpCode(HttpStatus.CREATED)
  // Ảnh nội dung tối đa 5MB → giữ trong RAM là đủ, multer tự chặn ảnh lớn hơn
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: CONTENT_IMAGE_MAX_BYTES } }),
  )
  async uploadContentImage(
    @Req() req: RequestWithUser,
    @Param('courseId') courseIdParam: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const courseId = parseBigIntParam(courseIdParam, 'Mã khóa học (courseId)');
    const data = await this.uploadService.uploadContentImage(
      toUser(req),
      courseId,
      file,
    );
    return { message: 'Tải ảnh lên thành công', data };
  }

  /** Tải tệp đính kèm chèn trong trình soạn thảo (PDF, Word, Excel, ZIP...) — multipart field `file` */
  @Post('courses/:courseId/content-attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: LESSON_FILES_STORAGE,
      limits: { fileSize: MULTER_HARD_LIMIT_BYTES },
    }),
  )
  async uploadContentAttachment(
    @Req() req: RequestWithUser,
    @Param('courseId') courseIdParam: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const courseId = parseBigIntParam(courseIdParam, 'Mã khóa học (courseId)');
    const data = await this.uploadService.uploadContentAttachment(
      toUser(req),
      courseId,
      file,
    );
    return { message: 'Tải tệp đính kèm lên thành công', data };
  }

  /** Tải / xem tệp đính kèm nội dung — kiểm tra quyền và cấp signed URL 10 phút (CH-67) */
  @Get('courses/:courseId/content-attachments/download')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT)
  async downloadContentAttachment(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Param('courseId') courseIdParam: string,
    @Query('key') keyParam: string,
    @Query('fileName') fileNameParam?: string,
    @Query('action') actionParam?: string,
  ) {
    const courseId = parseBigIntParam(courseIdParam, 'Mã khóa học (courseId)');
    if (!keyParam) {
      throw new BadRequestException('Thiếu tham số key của tệp đính kèm');
    }
    const user = toUser(req);
    const isDownload = actionParam !== 'preview';
    const result = await this.uploadService.generateContentAttachmentUrl(
      user,
      courseId,
      keyParam,
      fileNameParam,
      isDownload,
    );
    const accept = req.headers['accept'] || '';
    if (accept.includes('application/json') && !req.query.redirect) {
      return res.status(HttpStatus.OK).json({
        message: 'Lấy đường dẫn tải thành công',
        data: result,
      });
    }
    return res.redirect(result.url);
  }
}
