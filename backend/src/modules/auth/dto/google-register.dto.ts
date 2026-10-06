import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums.js';

export class GoogleRegisterDto {
  @IsNotEmpty({ message: 'Google ID Token không được để trống.' })
  @IsString({ message: 'Google ID Token phải là chuỗi ký tự.' })
  idToken: string;

  @IsNotEmpty({ message: 'Vai trò người dùng không được để trống.' })
  @IsEnum(UserRole, {
    message: 'Vai trò người dùng phải là TEACHER hoặc STUDENT.',
  })
  role: UserRole;
}
