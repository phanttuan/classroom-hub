import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../../generated/prisma/enums.js';

export class RegisterDto {
  @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @MinLength(2, { message: 'Họ và tên phải có tối thiểu 2 ký tự.' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName: string;

  @IsNotEmpty({ message: 'Địa chỉ email không được để trống.' })
  @IsEmail({}, { message: 'Email không đúng định dạng (vd: name@domain.com).' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(8, {
    message: 'Mật khẩu phải có tối thiểu 8 ký tự.',
  })
  @MaxLength(64, { message: 'Mật khẩu không được vượt quá 64 ký tự.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu cần gồm chữ hoa, chữ thường và chữ số.',
  })
  password: string;

  @IsNotEmpty({ message: 'Vai trò người dùng không được để trống.' })
  @IsEnum(UserRole, {
    message: 'Vai trò người dùng phải là TEACHER hoặc STUDENT.',
  })
  role: UserRole;
}
