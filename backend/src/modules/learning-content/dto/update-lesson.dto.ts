import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { LessonStatus } from '../../../generated/prisma/enums.js';
import { LessonSettingsDto } from './lesson-settings.dto.js';

/** Giống CreateLessonDto nhưng không có `type` — loại bài không đổi được sau khi tạo (như Moodle) */
export class UpdateLessonDto {
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Tên tối đa 255 ký tự' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'Mô tả phải là chuỗi' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'Nội dung phải là chuỗi' })
  @IsOptional()
  content?: string;

  @IsString({ message: 'URL phải là chuỗi' })
  @MaxLength(2048, { message: 'URL tối đa 2048 ký tự' })
  @IsOptional()
  externalUrl?: string;

  @ValidateNested()
  @Type(() => LessonSettingsDto)
  @IsOptional()
  settings?: LessonSettingsDto;

  @IsEnum(LessonStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: LessonStatus;
}
