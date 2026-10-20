import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCourseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên khóa học phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên khóa học không được để trống' })
  @MaxLength(255, { message: 'Tên khóa học không được vượt quá 255 ký tự' })
  name: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Mô tả khóa học phải là chuỗi' })
  @MaxLength(2000, { message: 'Mô tả khóa học không được vượt quá 2000 ký tự' })
  description?: string;
}

