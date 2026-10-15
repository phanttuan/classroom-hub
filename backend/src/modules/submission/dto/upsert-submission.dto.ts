import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Giới hạn độ dài HTML bài làm văn bản (ký tự) — tránh gửi nội dung quá lớn */
export const SUBMISSION_CONTENT_MAX_LENGTH = 200_000;

/**
 * Body của PUT /courses/:courseId/assignments/:assignmentId/submission (multipart/form-data).
 * Tệp đính kèm gửi ở field `file`; các trường bên dưới là text nên boolean tới dạng chuỗi "true"/"false".
 */
export class UpsertSubmissionDto {
  /** Bài làm văn bản (HTML từ trình soạn thảo) — bị từ chối nếu bài tập không cho phép */
  @IsOptional()
  @IsString({ message: 'Bài làm văn bản phải là chuỗi' })
  @MaxLength(SUBMISSION_CONTENT_MAX_LENGTH, {
    message: 'Bài làm văn bản quá dài',
  })
  content?: string;

  /**
   * true → gỡ tệp đã đính kèm trước đó (khi không gửi tệp mới).
   * Đọc giá trị gốc từ `obj` vì enableImplicitConversion biến chuỗi "false" thành true.
   */
  @IsOptional()
  @Transform(({ obj }) => {
    const raw = (obj as { removeFile?: unknown })?.removeFile;
    return typeof raw === 'string' ? raw.trim().toLowerCase() === 'true' : Boolean(raw);
  })
  @IsBoolean()
  removeFile?: boolean;
}
