import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from '../../../generated/prisma/enums.js';

export class CreateQuestionChoiceDto {
  @IsString({ message: 'Nội dung lựa chọn phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung lựa chọn không được để trống' })
  content!: string;

  @IsBoolean({ message: 'Đáp án đúng phải là true/false' })
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsString({ message: 'Nội dung câu hỏi phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung câu hỏi không được để trống' })
  @MaxLength(5000, { message: 'Nội dung câu hỏi quá dài' })
  content!: string;

  @IsEnum(QuestionType, {
    message: 'Loại câu hỏi phải là SINGLE hoặc MULTIPLE',
  })
  questionType!: QuestionType;

  @IsOptional()
  @IsNumber({}, { message: 'Điểm mặc định phải là số' })
  @Min(0.01, { message: 'Điểm mặc định phải lớn hơn hoặc bằng 0.01' })
  defaultScore?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^[1-9]\d*$/, { message: 'Mã bộ câu hỏi (setId) không hợp lệ' })
  setId?: string;

  @IsArray({ message: 'Danh sách lựa chọn phải là mảng' })
  @ArrayMinSize(2, { message: 'Câu hỏi phải có ít nhất 2 lựa chọn' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionChoiceDto)
  choices!: CreateQuestionChoiceDto[];
}
