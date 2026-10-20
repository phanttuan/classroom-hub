import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateQuizDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : String(value ?? ''),
  )
  @IsString({ message: 'Mã chủ đề (moduleId) phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã chủ đề (moduleId) không được để trống' })
  @Matches(/^[1-9]\d*$/, { message: 'Mã chủ đề (moduleId) không hợp lệ' })
  moduleId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tiêu đề đề kiểm tra phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề đề kiểm tra không được để trống' })
  @MaxLength(255, {
    message: 'Tiêu đề đề kiểm tra không được vượt quá 255 ký tự',
  })
  title!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Hướng dẫn làm bài phải là chuỗi' })
  instructions?: string;

  @IsDateString(
    {},
    { message: 'Thời gian mở (openAt) phải là chuỗi ngày hợp lệ (ISO 8601)' },
  )
  @IsNotEmpty({ message: 'Thời gian mở (openAt) không được để trống' })
  openAt!: string;

  @IsDateString(
    {},
    { message: 'Hạn đóng (dueAt) phải là chuỗi ngày hợp lệ (ISO 8601)' },
  )
  @IsNotEmpty({ message: 'Hạn đóng (dueAt) không được để trống' })
  dueAt!: string;

  @IsOptional()
  @IsInt({ message: 'Thời lượng làm bài phải là số nguyên (phút)' })
  @Min(1, { message: 'Thời lượng làm bài phải lớn hơn hoặc bằng 1 phút' })
  @Max(1440, { message: 'Thời lượng làm bài không được vượt quá 1440 phút' })
  durationMinutes?: number;

  @IsOptional()
  @IsInt({ message: 'Số lần làm bài tối đa phải là số nguyên' })
  @Min(1, { message: 'Số lần làm bài tối đa phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Số lần làm bài tối đa không được vượt quá 100' })
  maxAttempts?: number;

  @IsOptional()
  @IsBoolean({ message: 'Tùy chọn chấm điểm phải là true/false' })
  scoringEnabled?: boolean;

  @IsOptional()
  @IsBoolean({
    message: 'Tùy chọn hiện đáp án sau khi nộp phải là true/false',
  })
  showAnswersAfterSubmit?: boolean;
}
