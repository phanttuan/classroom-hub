import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../../database/database.module.js';
import { ResourceModule } from '../resource/resource.module.js';
import { SubmissionController } from './submission.controller.js';
import { SubmissionService } from './submission.service.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({}), ResourceModule],
  controllers: [SubmissionController],
  providers: [SubmissionService],
  exports: [SubmissionService],
})
export class SubmissionModule {}
