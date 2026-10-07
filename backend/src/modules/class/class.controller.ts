import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClassService } from './class.service.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { UpdateClassStatusDto } from './dto/update-class-status.dto.js';
import { JoinClassDto } from './dto/join-class.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ClassOwnerGuard } from '../../common/guards/class-owner.guard.js';
import { ClassMemberGuard } from '../../common/guards/class-member.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type {
  RequestWithUser,
  RequestWithClassContext,
} from '../../common/interfaces/request-with-user.interface.js';

@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  /**
   * Tạo lớp học mới (UC-05: chỉ dành cho Giáo viên)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async createClass(
    @Req() req: RequestWithUser,
    @Body() dto: CreateClassDto,
  ) {
    const teacherId = BigInt(req.user!.id);
    const createdClass = await this.classService.create(teacherId, dto);
    return {
      message: 'Tạo lớp học thành công',
      data: createdClass,
    };
  }

  /**
   * Tham gia lớp học bằng mã mời (UC-07: Sinh viên)
   * Giới hạn Rate Limit 10 lần / phút để chống brute-force quét mã.
   */
  @Post('join')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async joinClass(
    @Req() req: RequestWithUser,
    @Body() dto: JoinClassDto,
  ) {
    const studentId = BigInt(req.user!.id);
    const result = await this.classService.joinClass(studentId, dto.classCode);
    return {
      message: result.isReactivated
        ? 'Tham gia lại lớp học thành công. Lịch sử học tập trước đó đã được khôi phục.'
        : 'Tham gia lớp học thành công',
      data: result.classroom,
    };
  }

  /**
   * Xem danh sách lớp học theo vai trò (UC-08)
   * - Giáo viên: xem các lớp mình phụ trách
   * - Sinh viên: xem các lớp mình đang tham gia (ACTIVE)
   * - Quản trị viên: xem tất cả các lớp
   */
  @Get()
  async listClasses(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userRole = req.user!.role;
    const userId = BigInt(req.user!.id);
    const filter = {
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    if (userRole === UserRole.TEACHER) {
      return this.classService.findTeacherClasses(userId, filter);
    }

    if (userRole === UserRole.STUDENT) {
      return this.classService.findStudentClasses(userId, filter);
    }

    if (userRole === UserRole.ADMIN) {
      return this.classService.findAllClasses(filter);
    }

    throw new ForbiddenException('Chưa hỗ trợ danh sách lớp học cho vai trò này');
  }

  /**
   * Lấy chi tiết lớp học
   */
  @Get(':classId')
  @UseGuards(ClassMemberGuard)
  async getClassDetail(@Req() req: RequestWithClassContext) {
    const classId = req.classroom!.id;
    return this.classService.findOne(classId);
  }

  /**
   * Chỉnh sửa thông tin lớp học (Tên, mô tả)
   * Chỉ Giáo viên sở hữu lớp mới có quyền thực hiện.
   */
  @Patch(':classId')
  @UseGuards(ClassOwnerGuard)
  async updateClass(
    @Req() req: RequestWithClassContext,
    @Body() dto: UpdateClassDto,
  ) {
    const classId = req.classroom!.id;
    const updated = await this.classService.update(classId, dto);
    return {
      message: 'Cập nhật thông tin lớp học thành công',
      data: updated,
    };
  }

  /**
   * Chuyển trạng thái lớp học (Đóng, Lưu trữ, Mở lại)
   * Chỉ Giáo viên sở hữu lớp mới có quyền thực hiện.
   */
  @Patch(':classId/status')
  @UseGuards(ClassOwnerGuard)
  async updateClassStatus(
    @Req() req: RequestWithClassContext,
    @Body() dto: UpdateClassStatusDto,
  ) {
    const classId = req.classroom!.id;
    const updated = await this.classService.changeStatus(classId, dto);
    return {
      message: 'Cập nhật trạng thái lớp học thành công',
      data: updated,
    };
  }
}
