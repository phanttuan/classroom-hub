import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LearningContentController } from './learning-content.controller.js';
import { LearningContentService } from './learning-content.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [LearningContentController],
  providers: [LearningContentService],
  exports: [LearningContentService],
})
export class LearningContentModule {}

