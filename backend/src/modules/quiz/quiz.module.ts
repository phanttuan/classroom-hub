import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QuizController } from './quiz.controller.js';
import { QuizService } from './quiz.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { QuizAttemptModule } from '../quiz-attempt/quiz-attempt.module.js';

@Module({
  // QuizAttemptModule cung cấp QuizGradeSyncService để tính lại điểm sổ khi đổi cách tính điểm nhiều lượt
  imports: [DatabaseModule, JwtModule.register({}), QuizAttemptModule],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
