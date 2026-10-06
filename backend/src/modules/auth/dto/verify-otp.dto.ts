import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Địa chỉ email không được để trống.' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsNotEmpty({ message: 'Mã xác thực OTP không được để trống.' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự.' })
  @Length(6, 6, { message: 'Mã OTP gồm đúng 6 chữ số.' })
  @Matches(/^[0-9]{6}$/, { message: 'Mã OTP chỉ bao gồm các chữ số từ 0 đến 9.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  otp: string;
}
