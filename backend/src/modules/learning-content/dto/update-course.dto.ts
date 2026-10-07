import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateCourseDto {
  @IsString({ message: 'Tên khóa học phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên khóa học không được để trống' })
  @MaxLength(255, { message: 'Tên khóa học tối đa 255 ký tự' })
  title: string;
}
