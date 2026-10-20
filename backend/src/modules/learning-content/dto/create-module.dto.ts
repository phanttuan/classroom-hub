import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateModuleDto {
  @IsString({ message: 'Tên module phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên module không được để trống' })
  @MaxLength(255, { message: 'Tên module tối đa 255 ký tự' })
  title: string;
}
