import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../../database/database.module.js';
import { QuizAttemptController } from './quiz-attempt.controller.js';
import { QuizAttemptService } from './quiz-attempt.service.js';
import { QuizGradeSyncService } from './quiz-grade-sync.service.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [QuizAttemptController],
  providers: [QuizAttemptService, QuizGradeSyncService],
  exports: [QuizAttemptService, QuizGradeSyncService],
})
export class QuizAttemptModule {}
