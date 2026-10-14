import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AssignmentController } from './assignment.controller.js';
import { AssignmentService } from './assignment.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}

