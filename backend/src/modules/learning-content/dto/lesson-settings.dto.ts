import { IsBoolean, IsIn, IsOptional } from 'class-validator';

/** Cách hiển thị FILE / URL (theo tùy chọn "Hiển thị" của Moodle) */
export const LESSON_DISPLAY_MODES = ['AUTO', 'EMBED', 'DOWNLOAD', 'OPEN', 'NEW_WINDOW'] as const;
export type LessonDisplayMode = (typeof LESSON_DISPLAY_MODES)[number];

/** Cách hiển thị nội dung FOLDER */
export const FOLDER_DISPLAY_MODES = ['PAGE', 'INLINE'] as const;
export type FolderDisplayMode = (typeof FOLDER_DISPLAY_MODES)[number];

export class LessonSettingsDto {
  @IsIn(LESSON_DISPLAY_MODES, { message: 'Kiểu hiển thị không hợp lệ' })
  @IsOptional()
  display?: LessonDisplayMode;

  /** Hiển thị mô tả trên trang khóa học */
  @IsBoolean()
  @IsOptional()
  showDescription?: boolean;

  /** FILE: hiển thị kích thước / loại tệp */
  @IsBoolean()
  @IsOptional()
  showSize?: boolean;

  @IsBoolean()
  @IsOptional()
  showType?: boolean;

  /** FOLDER: hiển thị trên trang riêng hay ngay trên trang khóa học */
  @IsIn(FOLDER_DISPLAY_MODES, { message: 'Kiểu hiển thị thư mục không hợp lệ' })
  @IsOptional()
  folderDisplay?: FolderDisplayMode;
}
