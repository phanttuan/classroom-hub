import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';

export class AttemptAnswerInputDto {
  @IsNotEmpty({ message: 'Mã câu hỏi trong lượt làm bài không được để trống' })
  @Matches(/^[1-9]\d*$/, { message: 'Mã câu hỏi trong lượt làm bài không hợp lệ' })
  attemptQuestionId!: string;

  /** Mảng rỗng = bỏ chọn (chưa trả lời) */
  @IsArray({ message: 'Danh sách đáp án phải là mảng' })
  @ArrayMaxSize(50, { message: 'Số đáp án chọn vượt quá giới hạn' })
  @Matches(/^[1-9]\d*$/, { each: true, message: 'Mã đáp án không hợp lệ' })
  choiceIds!: string[];
}

/** PATCH …/attempts/:attemptId/answers — lưu nháp một hoặc nhiều câu */
export class SaveAnswersDto {
  @IsArray({ message: 'Danh sách câu trả lời phải là mảng' })
  @ArrayMinSize(1, { message: 'Danh sách câu trả lời không được rỗng' })
  @ArrayMaxSize(500, { message: 'Số câu trả lời vượt quá giới hạn' })
  @ValidateNested({ each: true })
  @Type(() => AttemptAnswerInputDto)
  answers!: AttemptAnswerInputDto[];
}

/** POST …/attempts/:attemptId/submit — có thể gửi kèm đáp án cuối cùng */
export class SubmitAttemptDto {
  @IsOptional()
  @IsArray({ message: 'Danh sách câu trả lời phải là mảng' })
  @ArrayMaxSize(500, { message: 'Số câu trả lời vượt quá giới hạn' })
  @ValidateNested({ each: true })
  @Type(() => AttemptAnswerInputDto)
  answers?: AttemptAnswerInputDto[];
}
