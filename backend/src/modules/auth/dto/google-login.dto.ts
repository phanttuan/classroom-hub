import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsNotEmpty({ message: 'Google ID Token không được để trống.' })
  @IsString({ message: 'Google ID Token phải là chuỗi ký tự.' })
  idToken: string;
}
