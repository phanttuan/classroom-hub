import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClassController } from './class.controller.js';
import { ClassService } from './class.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
