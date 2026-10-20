import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QuizController } from './quiz.controller.js';
import { QuizService } from './quiz.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
