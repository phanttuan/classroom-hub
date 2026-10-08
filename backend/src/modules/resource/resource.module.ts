import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  ResourceController,
  LessonResourceController,
} from './resource.controller.js';
import { ResourceService } from './resource.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ResourceUploadController } from './resource-upload.controller.js';
import { ResourceUploadService } from './resource-upload.service.js';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [ResourceController, LessonResourceController, ResourceUploadController],
  providers: [ResourceService, CloudinaryService, ResourceUploadService],
  exports: [ResourceService, CloudinaryService],
})
export class ResourceModule {}

