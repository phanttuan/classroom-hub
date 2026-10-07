import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LessonStatus } from '../../../generated/prisma/enums.js';

export class CreateLessonDto {
  @IsString({ message: 'Tên bài học phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên bài học không được để trống' })
  @MaxLength(255, { message: 'Tên bài học tối đa 255 ký tự' })
  title: string;

  @IsString({ message: 'Nội dung bài học phải là chuỗi' })
  @IsOptional()
  content?: string;

  @IsEnum(LessonStatus, { message: 'Trạng thái bài học không hợp lệ' })
  @IsOptional()
  status?: LessonStatus;
}
