import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Body của PUT /courses/:courseId/assignments/:assignmentId/submissions/:submissionId/grade */
export class GradeSubmissionDto {
  /** Điểm trong khoảng 0..maxScore của bài tập (kiểm tra ở service) */
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Điểm phải là số (tối đa 2 chữ số thập phân)' })
  @Min(0, { message: 'Điểm không được âm' })
  score!: number;

  /** Nhận xét (HTML từ trình soạn thảo — được làm sạch trước khi lưu) */
  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi' })
  @MaxLength(50_000, { message: 'Nhận xét quá dài' })
  feedback?: string;
}
