import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LearningContentService } from './learning-content.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { ReorderDto } from './dto/reorder.dto.js';
import { ToggleProgressDto } from './dto/toggle-progress.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class LearningContentController {
  constructor(private readonly learningContentService: LearningContentService) {}

  // =========================================================================
  // COURSE ENDPOINTS
  // =========================================================================

  @Post('classes/:classId/courses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createCourse(
    @Req() req: RequestWithUser,
    @Param('classId') classIdStr: string,
    @Body() dto: CreateCourseDto,
  ) {
    const course = await this.learningContentService.createCourse(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(classIdStr),
      dto,
    );
    return {
      message: 'Tạo khóa học thành công',
      data: course,
    };
  }

  @Get('classes/:classId/courses')
  async getCoursesByClass(
    @Req() req: RequestWithUser,
    @Param('classId') classIdStr: string,
  ) {
    const courses = await this.learningContentService.getCoursesByClass(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(classIdStr),
    );
    return {
      message: 'Lấy danh sách khóa học thành công',
      data: courses,
    };
  }

  @Get('courses/:courseId')
  async getCourseDetail(
    @Req() req: RequestWithUser,
    @Param('courseId') courseIdStr: string,
  ) {
    const course = await this.learningContentService.getCourseDetail(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(courseIdStr),
    );
    return {
      message: 'Lấy chi tiết khóa học thành công',
      data: course,
    };
  }

  @Patch('courses/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async updateCourse(
    @Req() req: RequestWithUser,
    @Param('courseId') courseIdStr: string,
    @Body() dto: UpdateCourseDto,
  ) {
    const course = await this.learningContentService.updateCourse(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(courseIdStr),
      dto,
    );
    return {
      message: 'Cập nhật khóa học thành công',
      data: course,
    };
  }

  @Delete('courses/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteCourse(
    @Req() req: RequestWithUser,
    @Param('courseId') courseIdStr: string,
  ) {
    const result = await this.learningContentService.deleteCourse(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(courseIdStr),
    );
    return result;
  }

  @Patch('classes/:classId/courses/reorder')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async reorderCourses(
    @Req() req: RequestWithUser,
    @Param('classId') classIdStr: string,
    @Body() dto: ReorderDto,
  ) {
    const result = await this.learningContentService.reorderCourses(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(classIdStr),
      dto.itemIds,
    );
    return result;
  }

  // =========================================================================
  // MODULE ENDPOINTS
  // =========================================================================

  @Post('courses/:courseId/modules')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createModule(
    @Req() req: RequestWithUser,
    @Param('courseId') courseIdStr: string,
    @Body() dto: CreateModuleDto,
  ) {
    const module = await this.learningContentService.createModule(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(courseIdStr),
      dto,
    );
    return {
      message: 'Tạo module thành công',
      data: module,
    };
  }

  @Patch('modules/:moduleId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async updateModule(
    @Req() req: RequestWithUser,
    @Param('moduleId') moduleIdStr: string,
    @Body() dto: UpdateModuleDto,
  ) {
    const module = await this.learningContentService.updateModule(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(moduleIdStr),
      dto,
    );
    return {
      message: 'Cập nhật module thành công',
      data: module,
    };
  }

  @Delete('modules/:moduleId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteModule(
    @Req() req: RequestWithUser,
    @Param('moduleId') moduleIdStr: string,
  ) {
    const result = await this.learningContentService.deleteModule(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(moduleIdStr),
    );
    return result;
  }

  @Patch('courses/:courseId/modules/reorder')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async reorderModules(
    @Req() req: RequestWithUser,
    @Param('courseId') courseIdStr: string,
    @Body() dto: ReorderDto,
  ) {
    const result = await this.learningContentService.reorderModules(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(courseIdStr),
      dto.itemIds,
    );
    return result;
  }

  // =========================================================================
  // LESSON ENDPOINTS
  // =========================================================================

  @Post('modules/:moduleId/lessons')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createLesson(
    @Req() req: RequestWithUser,
    @Param('moduleId') moduleIdStr: string,
    @Body() dto: CreateLessonDto,
  ) {
    const lesson = await this.learningContentService.createLesson(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(moduleIdStr),
      dto,
    );
    return {
      message: 'Tạo bài học thành công',
      data: lesson,
    };
  }

  @Get('lessons/:lessonId')
  async getLessonDetail(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonIdStr: string,
  ) {
    const lesson = await this.learningContentService.getLessonDetail(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(lessonIdStr),
    );
    return {
      message: 'Lấy chi tiết bài học thành công',
      data: lesson,
    };
  }

  @Patch('lessons/:lessonId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async updateLesson(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonIdStr: string,
    @Body() dto: UpdateLessonDto,
  ) {
    const lesson = await this.learningContentService.updateLesson(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(lessonIdStr),
      dto,
    );
    return {
      message: 'Cập nhật bài học thành công',
      data: lesson,
    };
  }

  @Delete('lessons/:lessonId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteLesson(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonIdStr: string,
  ) {
    const result = await this.learningContentService.deleteLesson(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(lessonIdStr),
    );
    return result;
  }

  @Patch('modules/:moduleId/lessons/reorder')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async reorderLessons(
    @Req() req: RequestWithUser,
    @Param('moduleId') moduleIdStr: string,
    @Body() dto: ReorderDto,
  ) {
    const result = await this.learningContentService.reorderLessons(
      BigInt(req.user!.id),
      req.user!.role as UserRole,
      BigInt(moduleIdStr),
      dto.itemIds,
    );
    return result;
  }

  // =========================================================================
  // PROGRESS ENDPOINTS (STUDENT)
  // =========================================================================

  @Post('lessons/:lessonId/progress')
  async toggleProgress(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonIdStr: string,
    @Body() dto: ToggleProgressDto,
  ) {
    const result = await this.learningContentService.toggleLessonProgress(
      BigInt(req.user!.id),
      BigInt(lessonIdStr),
      dto.isCompleted,
    );
    return {
      message: 'Cập nhật tiến độ học tập thành công',
      data: result,
    };
  }
}
