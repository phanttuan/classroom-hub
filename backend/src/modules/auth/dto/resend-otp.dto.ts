import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResendOtpDto {
  @IsNotEmpty({ message: 'Địa chỉ email không được để trống.' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}
