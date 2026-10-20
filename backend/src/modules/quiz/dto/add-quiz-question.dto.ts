import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class AddQuizQuestionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : String(value ?? ''),
  )
  @IsString({ message: 'Mã câu hỏi (questionId) phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã câu hỏi (questionId) không được để trống' })
  @Matches(/^[1-9]\d*$/, { message: 'Mã câu hỏi (questionId) không hợp lệ' })
  questionId!: string;

  /** Không truyền → dùng QuestionBank.defaultScore */
  @IsOptional()
  @IsNumber({}, { message: 'Điểm của câu hỏi phải là số' })
  @Min(0.01, { message: 'Điểm của câu hỏi phải lớn hơn hoặc bằng 0.01' })
  maxScore?: number;
}
