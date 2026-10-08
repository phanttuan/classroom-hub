import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ResourceService } from './resource.service.js';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';

function parseBigIntParam(value: string, name: string): bigint {
  if (!value || !/^[1-9]\d*$/.test(value.trim())) {
    throw new BadRequestException(`${name} không hợp lệ`);
  }
  return BigInt(value.trim());
}

@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  /**
   * Lấy signed URL xem tài liệu trực tiếp (preview) — thời hạn 10 phút
   */
  @Get(':resourceId/preview')
  async getPreviewUrl(
    @Req() req: RequestWithUser,
    @Param('resourceId') resourceIdParam: string,
  ) {
    const resourceId = parseBigIntParam(resourceIdParam, 'Mã tài liệu (resourceId)');
    const user = {
      id: BigInt(req.user!.id),
      role: req.user!.role as UserRole,
    };
    return this.resourceService.getPreviewUrl(user, resourceId);
  }

  /**
   * Lấy signed URL tải tài liệu (download) có flag fl_attachment — thời hạn 10 phút
   */
  @Get(':resourceId/download')
  async getDownloadUrl(
    @Req() req: RequestWithUser,
    @Param('resourceId') resourceIdParam: string,
  ) {
    const resourceId = parseBigIntParam(resourceIdParam, 'Mã tài liệu (resourceId)');
    const user = {
      id: BigInt(req.user!.id),
      role: req.user!.role as UserRole,
    };
    return this.resourceService.getDownloadUrl(user, resourceId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  /**
   * Lấy danh sách tài liệu của bài học (đã lọc theo quyền học sinh / giáo viên)
   */
  @Get(':lessonId/resources')
  async getLessonResources(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonIdParam: string,
  ) {
    const lessonId = parseBigIntParam(lessonIdParam, 'Mã bài học (lessonId)');
    const user = {
      id: BigInt(req.user!.id),
      role: req.user!.role as UserRole,
    };
    return this.resourceService.getLessonResources(user, lessonId);
  }
}

