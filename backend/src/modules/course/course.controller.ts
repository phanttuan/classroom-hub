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
import { CourseService } from './course.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { UpdateCourseStatusDto } from './dto/update-course-status.dto.js';
import { JoinCourseDto } from './dto/join-course.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CourseOwnerGuard } from '../../common/guards/course-owner.guard.js';
import { CourseMemberGuard } from '../../common/guards/course-member.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type {
  RequestWithUser,
  RequestWithCourseContext,
} from '../../common/interfaces/request-with-user.interface.js';

@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  /**
   * Tạo môn học mới (chỉ dành cho Giảng viên / Giáo viên)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async createCourse(
    @Req() req: RequestWithUser,
    @Body() dto: CreateCourseDto,
  ) {
    const teacherId = BigInt(req.user!.id);
    const createdCourse = await this.courseService.create(teacherId, dto);
    return {
      message: 'Tạo lớp học thành công',
      data: createdCourse,
    };
  }

  /**
   * Tham gia môn học bằng mã mời (Sinh viên)
   * Giới hạn Rate Limit 10 lần / phút để chống brute-force quét mã.
   */
  @Post('join')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async joinCourse(
    @Req() req: RequestWithUser,
    @Body() dto: JoinCourseDto,
  ) {
    const studentId = BigInt(req.user!.id);
    const result = await this.courseService.joinCourse(studentId, dto.courseCode);
    return {
      message: result.isReactivated
        ? 'Tham gia lại lớp học thành công. Lịch sử học tập trước đó đã được khôi phục.'
        : 'Tham gia lớp học thành công',
      data: result.course,
    };
  }

  /**
   * Xem danh sách môn học theo vai trò
   * - Giáo viên: xem các môn mình phụ trách
   * - Sinh viên: xem các môn mình đang tham gia (ACTIVE)
   * - Quản trị viên: xem tất cả các môn
   */
  @Get()
  async listCourses(
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
      return this.courseService.findTeacherCourses(userId, filter);
    }

    if (userRole === UserRole.STUDENT) {
      return this.courseService.findStudentCourses(userId, filter);
    }

    if (userRole === UserRole.ADMIN) {
      return this.courseService.findAllCourses(filter);
    }

    throw new ForbiddenException('Chưa hỗ trợ danh sách lớp học cho vai trò này');
  }

  /**
   * Lấy chi tiết môn học
   */
  @Get(':courseId')
  @UseGuards(CourseMemberGuard)
  async getCourseDetail(@Req() req: RequestWithCourseContext) {
    const courseId = req.course!.id;
    return this.courseService.findOne(courseId);
  }

  /**
   * Lấy danh sách thành viên lớp học (giảng viên phụ trách + sinh viên đang tham gia)
   */
  @Get(':courseId/members')
  @UseGuards(CourseMemberGuard)
  async getCourseMembers(@Req() req: RequestWithCourseContext) {
    const courseId = req.course!.id;
    return this.courseService.findMembers(courseId);
  }

  /**
   * Chỉnh sửa thông tin môn học (Tên, mô tả)
   * Chỉ Giáo viên sở hữu môn học mới có quyền thực hiện.
   */
  @Patch(':courseId')
  @UseGuards(CourseOwnerGuard)
  async updateCourse(
    @Req() req: RequestWithCourseContext,
    @Body() dto: UpdateCourseDto,
  ) {
    const courseId = req.course!.id;
    const updated = await this.courseService.update(courseId, dto);
    return {
      message: 'Cập nhật thông tin lớp học thành công',
      data: updated,
    };
  }

  /**
   * Chuyển trạng thái môn học (Đóng, Lưu trữ, Mở lại)
   * Chỉ Giáo viên sở hữu môn học mới có quyền thực hiện.
   */
  @Patch(':courseId/status')
  @UseGuards(CourseOwnerGuard)
  async updateCourseStatus(
    @Req() req: RequestWithCourseContext,
    @Body() dto: UpdateCourseStatusDto,
  ) {
    const courseId = req.course!.id;
    const updated = await this.courseService.changeStatus(courseId, dto);
    return {
      message: 'Cập nhật trạng thái lớp học thành công',
      data: updated,
    };
  }
}

