import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateQuestionSetDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên bộ câu hỏi phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên bộ câu hỏi không được để trống' })
  @MaxLength(255, { message: 'Tên bộ câu hỏi không được vượt quá 255 ký tự' })
  name!: string;
}
