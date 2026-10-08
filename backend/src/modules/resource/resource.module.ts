import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  ResourceController,
  LessonResourceController,
} from './resource.controller.js';
import { ResourceService } from './resource.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [ResourceController, LessonResourceController],
  providers: [ResourceService, CloudinaryService],
  exports: [ResourceService, CloudinaryService],
})
export class ResourceModule {}

