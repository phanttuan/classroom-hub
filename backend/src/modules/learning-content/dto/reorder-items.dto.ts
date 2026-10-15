import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, Matches, ValidateNested } from 'class-validator';

export class ReorderItemDto {
  @IsIn(['LESSON', 'ASSIGNMENT'], { message: 'Loại mục phải là LESSON hoặc ASSIGNMENT' })
  type!: 'LESSON' | 'ASSIGNMENT';

  @IsNotEmpty({ message: 'Mã mục không được để trống' })
  @Matches(/^[1-9]\d*$/, { message: 'Mã mục không hợp lệ' })
  id!: string;
}

/** Thứ tự mới của toàn bộ mục (bài học + bài tập) trong một topic */
export class ReorderItemsDto {
  @IsArray({ message: 'Danh sách mục phải là mảng' })
  @ArrayMinSize(1, { message: 'Danh sách mục không được rỗng' })
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
