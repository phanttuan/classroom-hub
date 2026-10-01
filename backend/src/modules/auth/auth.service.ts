import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole, UserStatus, OtpType } from '../../generated/prisma/enums.js';

export interface TokenPayload {
  sub: string;
  email: string;
  fullName: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isProduction: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * BƯỚC 1 ĐĂNG KÝ: Tiếp nhận thông tin, tạo mã OTP và gửi qua Email
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    // 1. Kiểm tra email đã đăng ký chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(
        'Địa chỉ email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.',
      );
    }

    const now = new Date();

    // 2. Kiểm tra xem email có đang bị tạm khóa (do nhập sai OTP quá 5 lần) hay không
    const latestOtp = await this.prisma.otp.findFirst({
      where: {
        email,
        type: OtpType.REGISTER_VERIFY,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp) {
      if (latestOtp.blockedUntil && latestOtp.blockedUntil > now) {
        const remainingMinutes = Math.ceil(
          (latestOtp.blockedUntil.getTime() - now.getTime()) / 60000,
        );
        throw new ForbiddenException(
          `Bạn đã nhập sai mã OTP quá nhiều lần. Chức năng đăng ký tạm thời bị khóa trong ${remainingMinutes} phút.`,
        );
      }

      // Giới hạn tần suất gửi lại (cooldown 60 giây)
      const diffMs = now.getTime() - latestOtp.createdAt.getTime();
      if (diffMs < 60000) {
        const remainingSec = Math.ceil((60000 - diffMs) / 1000);
        throw new BadRequestException(
          `Vui lòng đợi ${remainingSec} giây trước khi yêu cầu gửi lại mã xác thực.`,
        );
      }
    }

    // 3. Tạo mã OTP ngẫu nhiên 6 chữ số và mã hóa mật mã bảo mật (không lưu plain text OTP)
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const payload = JSON.stringify({
      fullName: dto.fullName,
      email,
      passwordHash,
      role: dto.role,
    });

    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 phút

    // Vô hiệu hóa các mã OTP đăng ký cũ chưa hoàn tất của email này
    await this.prisma.otp.updateMany({
      where: {
        email,
        type: OtpType.REGISTER_VERIFY,
        consumedAt: null,
      },
      data: {
        consumedAt: now,
      },
    });

    // 4. Lưu bản ghi OTP mới vào bảng generic `otps`
    await this.prisma.otp.create({
      data: {
        email,
        type: OtpType.REGISTER_VERIFY,
        otpHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt,
        payload,
      },
    });

    // 5. Gửi Email chứa OTP qua Resend (bảo mật tuyệt đối, không log ra console)
    const roleName =
      dto.role === UserRole.TEACHER
        ? 'Giáo viên / Giảng viên'
        : 'Học sinh / Sinh viên';

    await this.mailService.sendOtpEmail({
      to: email,
      fullName: dto.fullName,
      otp,
      roleName,
      expiresInMinutes: 5,
      type: OtpType.REGISTER_VERIFY,
    });

    return {
      message: 'Mã xác thực OTP đã được gửi đến email của bạn.',
      email,
      cooldownSeconds: 60,
      expiresInSeconds: 300,
    };
  }

  /**
   * BƯỚC 2 ĐĂNG KÝ: Xác thực OTP, tạo tài khoản chính thức và tự động đăng nhập
   */
  async verifyOtp(dto: VerifyOtpDto, res: Response) {
    const email = dto.email.trim().toLowerCase();
    const now = new Date();

    const otpRecord = await this.prisma.otp.findFirst({
      where: {
        email,
        type: OtpType.REGISTER_VERIFY,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord || !otpRecord.payload) {
      throw new BadRequestException(
        'Không tìm thấy yêu cầu đăng ký hợp lệ hoặc thông tin đã hết hạn. Vui lòng thực hiện lại.',
      );
    }

    // 1. Kiểm tra block do sai quá số lần quy định
    if (otpRecord.blockedUntil && otpRecord.blockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (otpRecord.blockedUntil.getTime() - now.getTime()) / 60000,
      );
      throw new ForbiddenException(
        `Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng đợi ${remainingMinutes} phút trước khi thử lại.`,
      );
    }

    // 2. Kiểm tra hạn mã OTP
    if (otpRecord.expiresAt < now) {
      throw new BadRequestException(
        'Mã xác thực OTP đã hết hạn (5 phút). Vui lòng yêu cầu gửi lại mã mới.',
      );
    }

    // 3. Đối chiếu mã OTP an toàn bằng bcrypt compare
    const isOtpValid = await bcrypt.compare(dto.otp, otpRecord.otpHash);
    if (!isOtpValid) {
      const nextAttempts = otpRecord.attempts + 1;
      const MAX_ATTEMPTS = otpRecord.maxAttempts || 5;

      if (nextAttempts >= MAX_ATTEMPTS) {
        const blockedUntil = new Date(now.getTime() + 15 * 60 * 1000); // Khóa 15 phút
        await this.prisma.otp.update({
          where: { id: otpRecord.id },
          data: { attempts: nextAttempts, blockedUntil },
        });
        throw new ForbiddenException(
          'Bạn đã nhập sai OTP 5 lần liên tiếp. Tài khoản đăng ký bị tạm khóa trong 15 phút.',
        );
      }

      await this.prisma.otp.update({
        where: { id: otpRecord.id },
        data: { attempts: nextAttempts },
      });

      const remainingAttempts = MAX_ATTEMPTS - nextAttempts;
      throw new UnauthorizedException(
        `Mã xác thực OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.`,
      );
    }

    // 4. Giải mã payload và tạo tài khoản chính thức
    const payload = JSON.parse(otpRecord.payload);

    // Kiểm tra trùng lần cuối
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Tài khoản này đã tồn tại trên hệ thống.');
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        fullName: payload.fullName,
        passwordHash: payload.passwordHash,
        role: payload.role as UserRole,
        status: UserStatus.ACTIVE,
      },
    });

    // 5. Đánh dấu bản ghi OTP đã được sử dụng (ngăn chặn Replay Attack)
    await this.prisma.otp.update({
      where: { id: otpRecord.id },
      data: { consumedAt: now },
    });

    // 6. Cấp phát JWT token & lưu vào HttpOnly Cookie
    const tokens = await this.generateAndSetTokens(newUser, res);

    return {
      message: 'Đăng ký và xác thực tài khoản thành công!',
      user: {
        id: newUser.id.toString(),
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        status: newUser.status,
      },
      tokens,
    };
  }

  /**
   * GỬI LẠI MÃ OTP (Resend OTP)
   */
  async resendOtp(dto: ResendOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const now = new Date();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(
        'Địa chỉ email này đã hoàn tất đăng ký. Vui lòng đăng nhập.',
      );
    }

    const latestOtp = await this.prisma.otp.findFirst({
      where: {
        email,
        type: OtpType.REGISTER_VERIFY,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp || !latestOtp.payload) {
      throw new BadRequestException(
        'Chưa có thông tin đăng ký cho email này. Vui lòng quay lại form đăng ký.',
      );
    }

    if (latestOtp.blockedUntil && latestOtp.blockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (latestOtp.blockedUntil.getTime() - now.getTime()) / 60000,
      );
      throw new ForbiddenException(
        `Bạn đang bị khóa tạm thời. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      );
    }

    const diffMs = now.getTime() - latestOtp.createdAt.getTime();
    if (diffMs < 60000) {
      const remainingSec = Math.ceil((60000 - diffMs) / 1000);
      throw new BadRequestException(
        `Vui lòng đợi ${remainingSec} giây trước khi gửi lại mã OTP mới.`,
      );
    }

    const payload = JSON.parse(latestOtp.payload);
    const newOtp = crypto.randomInt(100000, 999999).toString();
    const newOtpHash = await bcrypt.hash(newOtp, 10);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    // Vô hiệu hóa mã OTP cũ
    await this.prisma.otp.updateMany({
      where: {
        email,
        type: OtpType.REGISTER_VERIFY,
        consumedAt: null,
      },
      data: {
        consumedAt: now,
      },
    });

    await this.prisma.otp.create({
      data: {
        email,
        type: OtpType.REGISTER_VERIFY,
        otpHash: newOtpHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt,
        payload: latestOtp.payload,
      },
    });

    const roleName =
      payload.role === UserRole.TEACHER
        ? 'Giáo viên / Giảng viên'
        : 'Học sinh / Sinh viên';

    await this.mailService.sendOtpEmail({
      to: email,
      fullName: payload.fullName,
      otp: newOtp,
      roleName,
      expiresInMinutes: 5,
      type: OtpType.REGISTER_VERIFY,
    });

    return {
      message: 'Đã gửi mã OTP mới đến email của bạn.',
      cooldownSeconds: 60,
      expiresInSeconds: 300,
    };
  }

  /**
   * ĐĂNG NHẬP (Login & cấp Access/Refresh Token vào HttpOnly Cookie)
   */
  async login(dto: LoginDto, res: Response) {
    const email = dto.email.trim().toLowerCase();

    // 1. Tìm tài khoản
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // 2. Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // 3. Kiểm tra trạng thái tài khoản (BR-EDU-206)
    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenException(
        'Tài khoản của bạn hiện đang bị KHÓA bởi Quản trị viên (BR-EDU-206). Vui lòng liên hệ hỗ trợ.',
      );
    }

    // 4. Tạo token và lưu vào HttpOnly Cookie
    const tokens = await this.generateAndSetTokens(user, res);

    return {
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
      tokens,
    };
  }

  /**
   * LÀM MỚI PHIÊN ĐĂNG NHẬP (Refresh Token Rotation)
   */
  async refreshToken(refreshTokenRaw: string | undefined, res: Response) {
    if (!refreshTokenRaw) {
      throw new UnauthorizedException(
        'Không tìm thấy Refresh Token. Vui lòng đăng nhập lại.',
      );
    }

    try {
      const refreshSecret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'eduhub_super_secret_refresh_jwt_key_2026_dev_hcmute',
      );

      const decoded = this.jwtService.verify(refreshTokenRaw, {
        secret: refreshSecret,
      });

      const userId = BigInt(decoded.sub);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.status === UserStatus.LOCKED) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
      }

      // Đối chiếu refresh token trong database
      const storedTokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          revoked: false,
          expiresAt: { gt: new Date() },
        },
      });

      let matchedTokenRecord: any = null;
      for (const tokenRecord of storedTokens) {
        const isMatch = await bcrypt.compare(
          refreshTokenRaw,
          tokenRecord.tokenHash,
        );
        if (isMatch) {
          matchedTokenRecord = tokenRecord;
          break;
        }
      }

      if (!matchedTokenRecord) {
        throw new UnauthorizedException(
          'Refresh Token không hợp lệ hoặc đã bị thu hồi.',
        );
      }

      // Thu hồi token cũ (Refresh Token Rotation)
      await this.prisma.refreshToken.update({
        where: { id: matchedTokenRecord.id },
        data: { revoked: true },
      });

      // Tạo cặp token mới
      const tokens = await this.generateAndSetTokens(user, res);

      return {
        message: 'Làm mới token thành công',
        user: {
          id: user.id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        tokens,
      };
    } catch {
      this.clearAuthCookies(res);
      throw new UnauthorizedException(
        'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }
  }

  /**
   * ĐĂNG XUẤT HỆ THỐNG CHUYÊN NGHIỆP & BẢO MẬT (Enterprise Logout)
   * 1. Nhận diện danh tính: req.user, Access Token (kể cả đã hết hạn), hoặc Refresh Token
   * 2. Vô hiệu hóa Refresh Token trong Database (phiên hiện tại hoặc toàn bộ thiết bị)
   * 3. Xóa sạch HttpOnly Cookies trên trình duyệt (access_token & refresh_token)
   * 4. Dọn dẹp ngầm các token rác đã hết hạn
   * 5. Luôn trả về 200 OK an toàn, không bao giờ chặn người dùng đăng xuất
   */
  async logout(
    options: {
      userId?: string;
      refreshTokenRaw?: string;
      accessTokenRaw?: string;
      allDevices?: boolean;
    },
    res: Response,
  ) {
    let resolvedUserId: bigint | null = options.userId
      ? BigInt(options.userId)
      : null;
    const { allDevices = false, refreshTokenRaw, accessTokenRaw } = options;

    const accessSecret =
      this.configService.get<string>('JWT_SECRET') ||
      this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        'eduhub_super_secret_jwt_access_key_2026_dev_hcmute',
      );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'eduhub_super_secret_refresh_jwt_key_2026_dev_hcmute',
    );

    // 1. Nếu chưa có userId, cố gắng trích xuất từ Access Token (kể cả khi đã hết hạn)
    if (!resolvedUserId && accessTokenRaw) {
      try {
        const decoded = this.jwtService.verify(accessTokenRaw, {
          secret: accessSecret,
          ignoreExpiration: true,
        });
        if (decoded?.sub) {
          resolvedUserId = BigInt(decoded.sub);
        }
      } catch {
        // Bỏ qua nếu token không đúng định dạng
      }
    }

    // 2. Nếu vẫn chưa có userId, cố gắng trích xuất từ Refresh Token
    if (!resolvedUserId && refreshTokenRaw) {
      try {
        const decoded = this.jwtService.verify(refreshTokenRaw, {
          secret: refreshSecret,
          ignoreExpiration: true,
        });
        if (decoded?.sub) {
          resolvedUserId = BigInt(decoded.sub);
        }
      } catch {
        // Bỏ qua nếu refresh token không đúng định dạng
      }
    }

    // 3. Xử lý thu hồi Token trong Cơ sở dữ liệu (Database Token Revocation)
    let revokedCount = 0;
    if (resolvedUserId) {
      try {
        if (allDevices) {
          // Thu hồi TOÀN BỘ phiên của người dùng trên mọi thiết bị
          const result = await this.prisma.refreshToken.updateMany({
            where: {
              userId: resolvedUserId,
              revoked: false,
            },
            data: { revoked: true },
          });
          revokedCount = result.count;
          this.logger.log(
            `[AuthService] User ${resolvedUserId} đã đăng xuất khỏi TẤT CẢ thiết bị (Đã thu hồi ${revokedCount} phiên).`,
          );
        } else if (refreshTokenRaw) {
          // Thu hồi CHÍNH XÁC phiên đăng nhập hiện tại trên thiết bị này
          const activeTokens = await this.prisma.refreshToken.findMany({
            where: {
              userId: resolvedUserId,
              revoked: false,
            },
          });

          for (const tokenRecord of activeTokens) {
            const isMatch = await bcrypt.compare(
              refreshTokenRaw,
              tokenRecord.tokenHash,
            );
            if (isMatch) {
              await this.prisma.refreshToken.update({
                where: { id: tokenRecord.id },
                data: { revoked: true },
              });
              revokedCount = 1;
              break;
            }
          }

          // Fallback: Nếu không khớp token cụ thể, thu hồi token hoạt động gần nhất
          if (revokedCount === 0 && activeTokens.length > 0) {
            const latest = activeTokens[activeTokens.length - 1];
            await this.prisma.refreshToken.update({
              where: { id: latest.id },
              data: { revoked: true },
            });
            revokedCount = 1;
          }
        } else {
          // Không truyền refresh token: thu hồi phiên hoạt động gần nhất của user
          const latestToken = await this.prisma.refreshToken.findFirst({
            where: {
              userId: resolvedUserId,
              revoked: false,
            },
            orderBy: { createdAt: 'desc' },
          });
          if (latestToken) {
            await this.prisma.refreshToken.update({
              where: { id: latestToken.id },
              data: { revoked: true },
            });
            revokedCount = 1;
          }
        }

        // Tự động dọn dẹp các token rác đã hết hạn hoặc đã thu hồi lâu ngày (Housekeeping ngầm)
        this.prisma.refreshToken
          .deleteMany({
            where: {
              userId: resolvedUserId,
              OR: [
                { expiresAt: { lt: new Date() } },
                {
                  revoked: true,
                  createdAt: {
                    lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  },
                },
              ],
            },
          })
          .catch(() => {});
      } catch (err: any) {
        this.logger.warn(
          `[AuthService] Cảnh báo khi thu hồi token trong database: ${err.message}`,
        );
      }
    }

    // 4. Xóa sạch HttpOnly Cookies trên trình duyệt
    this.clearAuthCookies(res);

    return {
      success: true,
      message: allDevices
        ? 'Đã đăng xuất thành công khỏi tất cả các thiết bị.'
        : 'Đăng xuất thành công. Phiên làm việc đã được đóng an toàn.',
      data: {
        allDevices,
        revokedSessions: revokedCount,
      },
    };
  }

  /**
   * LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI (Get Profile)
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }

    return {
      id: user.id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  // ==============================================================================
  // HELPER METHODS: Quản lý JWT Token và HttpOnly Cookie
  // ==============================================================================

  private async generateAndSetTokens(user: any, res: Response) {
    const payload: TokenPayload = {
      sub: user.id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    const accessSecret =
      this.configService.get<string>('JWT_SECRET') ||
      this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        'eduhub_super_secret_jwt_access_key_2026_dev_hcmute',
      );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'eduhub_super_secret_refresh_jwt_key_2026_dev_hcmute',
    );
    const accessExpiresIn = (this.configService.get<string>('JWT_EXPIRES_IN') ||
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')) as any;
    const refreshExpiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
      '7d') as any;

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id.toString() },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      },
    );

    // Lưu Refresh Token vào Database để quản lý phiên
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    // Thiết lập Cookie bảo mật chuẩn HttpOnly chống tấn công XSS
    res.cookie('auth_token', accessToken, {
      httpOnly: true, // Bảo mật tuyệt đối: ngăn chặn hoàn toàn XSS đánh cắp access token
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 phút (Access token ngắn hạn theo chuẩn OWASP)
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, // Bảo mật tuyệt đối: Refresh token lưu an toàn trong cookie
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày (Refresh token dài hạn)
      path: '/',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
    };
  }

  private clearAuthCookies(res: Response) {
    const cookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: (this.isProduction ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    };

    res.clearCookie('auth_token', cookieOptions);
    res.clearCookie('access_token', cookieOptions); // Xóa sạch nếu còn sót từ phiên cũ
    res.clearCookie('refresh_token', cookieOptions);
  }
}
