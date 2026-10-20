import {
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateQuizQuestionDto {
  @IsNumber({}, { message: 'Điểm của câu hỏi phải là số' })
  @Min(0.01, { message: 'Điểm của câu hỏi phải lớn hơn hoặc bằng 0.01' })
  maxScore!: number;
}
