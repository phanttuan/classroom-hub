import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CourseOwnerGuard } from '../../common/guards/course-owner.guard.js';
import { CourseMemberGuard } from '../../common/guards/course-member.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithCourseContext } from '../../common/interfaces/request-with-user.interface.js';

function parseAssignmentId(raw: string): bigint {
  const trimmed = (raw ?? '').trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new BadRequestException('Mã bài tập (assignmentId) không hợp lệ');
  }
  return BigInt(trimmed);
}

@UseGuards(JwtAuthGuard)
@Controller('courses/:courseId/assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  /**
   * Tạo bài tập mới (DRAFT) kèm GradeItem (chỉ Giáo viên sở hữu khóa học)
   */
  @Post()
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Req() req: RequestWithCourseContext,
    @Body() dto: CreateAssignmentDto,
  ) {
    const teacherId = BigInt(req.user!.id);
    const courseId = req.course!.id;
    const data = await this.assignmentService.create(teacherId, courseId, dto);
    return {
      message: 'Tạo bài tập thành công',
      data,
    };
  }

  /**
   * Danh sách bài tập trong khóa học
   */
  @Get()
  @UseGuards(CourseMemberGuard)
  async listAssignments(
    @Req() req: RequestWithCourseContext,
    @Query('status') status?: string,
    @Query('moduleId') moduleId?: string,
  ) {
    const courseId = req.course!.id;
    const viewer = {
      id: BigInt(req.user!.id),
      role: req.user!.role as UserRole,
    };
    const data = await this.assignmentService.findAll(
      courseId,
      viewer,
      status,
      moduleId,
    );
    return {
      message: 'Lấy danh sách bài tập thành công',
      data,
    };
  }

  /**
   * Chi tiết một bài tập trong khóa học
   */
  @Get(':assignmentId')
  @UseGuards(CourseMemberGuard)
  async getAssignmentDetail(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
  ) {
    const courseId = req.course!.id;
    const assignmentId = parseAssignmentId(assignmentIdParam);
    const viewer = {
      id: BigInt(req.user!.id),
      role: req.user!.role as UserRole,
    };
    const data = await this.assignmentService.findOne(
      courseId,
      assignmentId,
      viewer,
    );
    return {
      message: 'Lấy chi tiết bài tập thành công',
      data,
    };
  }

  /**
   * Cập nhật bài tập khi còn ở trạng thái DRAFT (chỉ Giáo viên sở hữu khóa học)
   */
  @Patch(':assignmentId')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  async updateAssignment(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    const teacherId = BigInt(req.user!.id);
    const courseId = req.course!.id;
    const assignmentId = parseAssignmentId(assignmentIdParam);
    const data = await this.assignmentService.update(
      teacherId,
      courseId,
      assignmentId,
      dto,
    );
    return {
      message: 'Cập nhật bài tập thành công',
      data,
    };
  }

  /**
   * Xuất bản bài tập DRAFT -> PUBLISHED (chỉ Giáo viên sở hữu khóa học)
   */
  @Post(':assignmentId/publish')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  async publishAssignment(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
  ) {
    const courseId = req.course!.id;
    const assignmentId = parseAssignmentId(assignmentIdParam);
    const data = await this.assignmentService.publish(courseId, assignmentId);
    return {
      message: 'Xuất bản bài tập thành công',
      data,
    };
  }

  /**
   * Đóng bài tập PUBLISHED -> CLOSED (chỉ Giáo viên sở hữu khóa học)
   */
  @Post(':assignmentId/close')
  @UseGuards(RolesGuard, CourseOwnerGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  async closeAssignment(
    @Req() req: RequestWithCourseContext,
    @Param('assignmentId') assignmentIdParam: string,
  ) {
    const courseId = req.course!.id;
    const assignmentId = parseAssignmentId(assignmentIdParam);
    const data = await this.assignmentService.close(courseId, assignmentId);
    return {
      message: 'Đóng bài tập thành công',
      data,
    };
  }
}

