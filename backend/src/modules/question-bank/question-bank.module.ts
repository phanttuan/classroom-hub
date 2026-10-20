import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QuestionBankController } from './question-bank.controller.js';
import { QuestionBankService } from './question-bank.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [QuestionBankController],
  providers: [QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
