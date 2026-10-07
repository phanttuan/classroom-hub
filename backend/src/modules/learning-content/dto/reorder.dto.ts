import { ArrayMinSize, IsArray, IsNotEmpty } from 'class-validator';

export class ReorderDto {
  @IsArray({ message: 'Danh sách ID phải là mảng' })
  @ArrayMinSize(1, { message: 'Danh sách ID không được rỗng' })
  @IsNotEmpty({ message: 'Danh sách ID không được để trống' })
  itemIds: (string | number)[];
}
