import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { generateOtpEmailHtml } from './templates/otp-email.template.js';
import { OtpType } from '../../generated/prisma/enums.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private readonly emailFrom: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.emailFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      'EduHub <onboarding@resend.dev>';

    if (apiKey && apiKey.trim() !== '') {
      this.resend = new Resend(apiKey.trim());
      this.logger.log('✅ Resend Mail Service đã được khởi tạo thành công.');
    } else {
      this.logger.warn(
        '⚠️ Chưa tìm thấy RESEND_API_KEY hợp lệ trong file .env. Hệ thống sẵn sàng gửi mail ngay khi bạn điền key.',
      );
    }
  }

  async sendOtpEmail(params: {
    to: string;
    fullName: string;
    otp: string;
    roleName: string;
    expiresInMinutes?: number;
    type?: OtpType;
  }): Promise<{ success: boolean; messageId?: string }> {
    const {
      to,
      fullName,
      otp,
      roleName,
      expiresInMinutes = 5,
      type = OtpType.REGISTER_VERIFY,
    } = params;

    // Tuyệt đối không ghi log mã OTP hay thông tin nhạy cảm ra console
    this.logger.log(`📧 Đang gửi email mã OTP [${type}] tới địa chỉ: <${to}>...`);

    if (!this.resend) {
      const errorMsg =
        'Hệ thống gửi email chưa được cấu hình khóa RESEND_API_KEY trong file .env. Vui lòng kiểm tra lại cấu hình.';
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    try {
      const { subject, preview } = this.getSubjectAndPreview(
        type,
        otp,
        expiresInMinutes,
      );

      const logoUrl =
        this.configService.get<string>('APP_LOGO_URL') ||
        'https://files.catbox.moe/27b245.png';

      const html = generateOtpEmailHtml({
        fullName,
        email: to,
        otp,
        roleName,
        expiresInMinutes,
        type,
        previewText: preview,
        logoUrl,
      });

      const data = await this.resend.emails.send({
        from: this.emailFrom,
        to,
        subject,
        html,
      });

      if (data.error) {
        this.logger.error(
          `Lỗi từ Resend API khi gửi mail tới <${to}>: ${data.error.message}`,
        );
        throw new BadRequestException(
          `Không thể gửi email xác thực: ${data.error.message}`,
        );
      }

      this.logger.log(
        `✅ Email OTP [${type}] đã được gửi thành công tới: <${to}> (ID: ${data.data?.id})`,
      );
      return { success: true, messageId: data.data?.id };
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(
        `Ngoại lệ khi gửi email qua Resend: ${err.message}`,
        err.stack,
      );
      throw new BadRequestException(
        'Không thể gửi mã xác nhận qua email lúc này. Vui lòng kiểm tra lại địa chỉ email hoặc cấu hình mail service.',
      );
    }
  }

  /**
   * Tạo tiêu đề (Subject) chứa trực tiếp mã OTP và đoạn preview tóm tắt chuyên nghiệp
   */
  private getSubjectAndPreview(
    type: OtpType,
    otp: string,
    expiresInMinutes: number,
  ): { subject: string; preview: string } {
    switch (type) {
      case OtpType.REGISTER_VERIFY:
        return {
          subject: `Mã xác thực EduHub: ${otp}`,
          preview: `Đây là mã xác thực đăng ký tài khoản EduHub của bạn: ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.`,
        };
      case OtpType.PASSWORD_RESET:
        return {
          subject: `Mã đặt lại mật khẩu EduHub: ${otp}`,
          preview: `Đây là mã đặt lại mật khẩu tài khoản EduHub của bạn: ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút.`,
        };
      case OtpType.CHANGE_EMAIL:
        return {
          subject: `Mã xác nhận đổi email EduHub: ${otp}`,
          preview: `Đây là mã xác nhận thay đổi email tài khoản EduHub của bạn: ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút.`,
        };
      case OtpType.TWO_FACTOR_AUTH:
        return {
          subject: `Mã bảo mật EduHub: ${otp}`,
          preview: `Đây là mã xác thực bảo mật hai bước của bạn: ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút.`,
        };
      default:
        return {
          subject: `Mã xác thực EduHub: ${otp}`,
          preview: `Đây là mã xác thực EduHub của bạn: ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút.`,
        };
    }
  }
}
