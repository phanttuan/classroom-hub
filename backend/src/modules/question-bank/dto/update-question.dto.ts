import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
import { CreateQuestionChoiceDto } from './create-question.dto.js';

/**
 * PATCH câu hỏi trong ngân hàng.
 * - Chỉ đổi setId/điểm mặc định: cập nhật trực tiếp.
 * - Đổi nội dung/loại/đáp án: nếu câu hỏi chưa được quiz nào dùng thì cập nhật trực tiếp,
 *   nếu đã được dùng thì tạo phiên bản mới (version + 1) và giữ nguyên bản cũ ở trạng thái RETIRED.
 */
export class UpdateQuestionDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Nội dung câu hỏi phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung câu hỏi không được để trống' })
  @MaxLength(5000, { message: 'Nội dung câu hỏi quá dài' })
  content?: string;

  @IsOptional()
  @IsEnum(QuestionType, {
    message: 'Loại câu hỏi phải là SINGLE hoặc MULTIPLE',
  })
  questionType?: QuestionType;

  @IsOptional()
  @IsNumber({}, { message: 'Điểm mặc định phải là số' })
  @Min(0.01, { message: 'Điểm mặc định phải lớn hơn hoặc bằng 0.01' })
  defaultScore?: number;

  /** null = chuyển câu hỏi về "Chưa phân bộ" */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^[1-9]\d*$/, { message: 'Mã bộ câu hỏi (setId) không hợp lệ' })
  setId?: string | null;

  @IsOptional()
  @IsArray({ message: 'Danh sách lựa chọn phải là mảng' })
  @ArrayMinSize(2, { message: 'Câu hỏi phải có ít nhất 2 lựa chọn' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionChoiceDto)
  choices?: CreateQuestionChoiceDto[];
}
