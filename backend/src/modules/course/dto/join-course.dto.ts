import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class JoinCourseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'Mã môn học phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã môn học không được để trống' })
  @Length(6, 12, { message: 'Mã môn học phải có độ dài từ 6 đến 12 ký tự' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Mã môn học chỉ bao gồm chữ in hoa và chữ số' })
  courseCode: string;
}

