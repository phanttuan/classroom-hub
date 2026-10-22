import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CourseController } from './course.controller.js';
import { CourseService } from './course.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { QuizAttemptModule } from '../quiz-attempt/quiz-attempt.module.js';

@Module({
  // QuizAttemptModule: chốt lượt làm bài dở khi gỡ sinh viên khỏi khóa học
  imports: [DatabaseModule, JwtModule.register({}), QuizAttemptModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}

