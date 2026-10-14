import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAssignmentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : String(value ?? '')))
  @IsString({ message: 'Mã chủ đề (moduleId) phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã chủ đề (moduleId) không được để trống' })
  @Matches(/^[1-9]\d*$/, { message: 'Mã chủ đề (moduleId) không hợp lệ' })
  moduleId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tiêu đề bài tập phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề bài tập không được để trống' })
  @MaxLength(255, { message: 'Tiêu đề bài tập không được vượt quá 255 ký tự' })
  title!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Mô tả bài tập phải là chuỗi' })
  description?: string;

  @IsNumber({}, { message: 'Điểm tối đa phải là số' })
  @Min(0.01, { message: 'Điểm tối đa phải lớn hơn hoặc bằng 0.01' })
  maxScore!: number;

  @IsDateString({}, { message: 'Thời gian mở (openAt) phải là chuỗi ngày hợp lệ (ISO 8601)' })
  @IsNotEmpty({ message: 'Thời gian mở (openAt) không được để trống' })
  openAt!: string;

  @IsDateString({}, { message: 'Hạn nộp (dueAt) phải là chuỗi ngày hợp lệ (ISO 8601)' })
  @IsNotEmpty({ message: 'Hạn nộp (dueAt) không được để trống' })
  dueAt!: string;
}

