import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CourseController } from './course.controller.js';
import { CourseService } from './course.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}

