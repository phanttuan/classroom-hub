import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { GoogleRegisterDto } from './dto/google-register.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * BƯỚC 1: Đăng ký tài khoản (Gửi OTP qua email)
   * Giới hạn Rate Limit: 5 lần / phút
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * BƯỚC 2: Xác thực mã OTP và kích hoạt tài khoản
   * Giới hạn Rate Limit: 10 lần / phút
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.CREATED)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyOtp(dto, res);
  }

  /**
   * Gửi lại mã OTP
   * Giới hạn Rate Limit: 3 lần / phút
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  /**
   * Đăng nhập tài khoản
   * Giới hạn Rate Limit: 5 lần / phút (Chống brute-force)
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res);
  }

  /**
   * Đăng ký tài khoản bằng Google OAuth
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google/register')
  @HttpCode(HttpStatus.CREATED)
  async googleRegister(
    @Body() dto: GoogleRegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.googleRegister(dto, res);
  }

  /**
   * Đăng nhập bằng Google OAuth
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google/login')
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.googleLogin(dto, res);
  }

  /**
   * Làm mới Access Token thông qua HttpOnly Refresh Token
   */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req?.cookies?.['refresh_token'];
    return this.authService.refreshToken(refreshToken, res);
  }

  /**
   * Đăng xuất hệ thống (Thu hồi phiên, vô hiệu hóa Refresh Token & xóa sạch HttpOnly Cookie)
   * - Hỗ trợ đăng xuất thiết bị hiện tại (mặc định)
   * - Hỗ trợ đăng xuất toàn bộ thiết bị qua body { allDevices: true }
   * - Nhận diện token linh hoạt từ HttpOnly Cookie, Authorization Header hoặc Request Body
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: LogoutDto,
  ) {
    const accessToken =
      req?.cookies?.['auth_token'] ||
      req?.cookies?.['access_token'] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const refreshToken = req?.cookies?.['refresh_token'] || dto?.refreshToken;
    const userId = (req as any)?.user?.id;

    return this.authService.logout(
      {
        userId,
        accessTokenRaw: accessToken,
        refreshTokenRaw: refreshToken,
        allDevices: dto?.allDevices ?? false,
      },
      res,
    );
  }

  /**
   * Đăng xuất nhanh qua phương thức GET (Hỗ trợ Redirect / Browser Navigation)
   */
  @Public()
  @Get('logout')
  @HttpCode(HttpStatus.OK)
  async logoutGet(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken =
      req?.cookies?.['auth_token'] ||
      req?.cookies?.['access_token'] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const refreshToken = req?.cookies?.['refresh_token'];
    const userId = (req as any)?.user?.id;

    return this.authService.logout(
      {
        userId,
        accessTokenRaw: accessToken,
        refreshTokenRaw: refreshToken,
        allDevices: false,
      },
      res,
    );
  }

  /**
   * Lấy thông tin tài khoản người dùng hiện tại
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
