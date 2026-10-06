import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  /**
   * Đăng xuất khỏi tất cả các thiết bị đang đăng nhập của tài khoản này
   * - false (mặc định): Chỉ thu hồi phiên đăng nhập hiện tại trên thiết bị này
   * - true: Thu hồi toàn bộ phiên đăng nhập trên mọi thiết bị
   */
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean = false;

  /**
   * Tùy chọn truyền Refresh Token thủ công (dành cho Mobile App / Third-party Client không dùng HttpOnly Cookie)
   */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
