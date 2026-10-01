import { OtpType } from '../../../generated/prisma/enums.js';

export interface OtpEmailParams {
  fullName: string;
  email: string;
  otp: string;
  roleName?: string;
  expiresInMinutes?: number;
  type?: OtpType;
  previewText?: string;
  logoUrl?: string;
}

export function generateOtpEmailHtml({
  fullName,
  otp,
  roleName,
  expiresInMinutes = 5,
  type = OtpType.REGISTER_VERIFY,
  previewText,
  logoUrl = 'https://files.catbox.moe/27b245.png',
}: OtpEmailParams): string {
  // Xác định tiêu đề và lời nhắn dẫn dắt phù hợp với từng mục đích
  let headingTitle = 'Xác thực tài khoản EduHub';
  let leadMessage = `Cảm ơn bạn đã đăng ký tham gia nền tảng <strong style="color: #2563eb; font-weight: 700;">EduHub</strong>${roleName ? ` với vai trò <span style="white-space: nowrap;"><strong style="color: #2563eb; font-weight: 700;">${roleName}</strong></span>` : ''
    }.<br>Để hoàn tất kích hoạt tài khoản, vui lòng nhập mã xác thực dưới đây:`;

  if (type === OtpType.PASSWORD_RESET) {
    headingTitle = 'Yêu cầu đặt lại mật khẩu EduHub';
    leadMessage =
      'Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong style="color: #2563eb; font-weight: 700;">EduHub</strong> của bạn.<br>Vui lòng sử dụng mã xác thực bên dưới để thiết lập mật khẩu mới:';
  } else if (type === OtpType.CHANGE_EMAIL) {
    headingTitle = 'Xác nhận thay đổi email EduHub';
    leadMessage =
      'Bạn đang thực hiện thay đổi email liên kết với tài khoản <strong style="color: #2563eb; font-weight: 700;">EduHub</strong>.<br>Vui lòng nhập mã xác thực bên dưới để xác nhận:';
  } else if (type === OtpType.TWO_FACTOR_AUTH) {
    headingTitle = 'Mã bảo mật đăng nhập hai bước';
    leadMessage =
      'Vui lòng sử dụng mã bảo mật dưới đây để hoàn tất đăng nhập vào hệ thống <strong style="color: #2563eb; font-weight: 700;">EduHub</strong>:';
  }

  const defaultPreview = `Đây là mã xác thực EduHub của bạn: ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.`;
  const preview = previewText || defaultPreview;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${headingTitle}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    /* Chế độ nền tối (Dark mode) trên các ứng dụng Mail hiện đại */
    @media (prefers-color-scheme: dark) {
      body, .outer-wrapper {
        background-color: #0b1120 !important;
      }
      .email-card {
        background-color: #1e293b !important;
        border-color: #334155 !important;
        box-shadow: 0 10px 35px rgba(0, 0, 0, 0.45) !important;
      }
      .heading-title {
        color: #60a5fa !important;
      }
      .text-primary {
        color: #f1f5f9 !important;
      }
      .text-secondary {
        color: #cbd5e1 !important;
      }
      .otp-container {
        background-color: #0f172a !important;
        border-color: #2563eb !important;
      }
      .otp-badge {
        background-color: #1e3a8a !important;
        color: #93c5fd !important;
        border-color: #3b82f6 !important;
      }
      .otp-number {
        color: #60a5fa !important;
      }
      .otp-timer {
        color: #94a3b8 !important;
      }
      .security-box {
        background-color: #2d1802 !important;
        border-color: #78350f !important;
        border-left-color: #f59e0b !important;
      }
      .security-title {
        color: #fde68a !important;
      }
      .security-desc {
        color: #fef3c7 !important;
      }
      .footer-box {
        background-color: #0f172a !important;
        border-top-color: #1e293b !important;
        color: #64748b !important;
      }
      .logo-img {
        filter: drop-shadow(0 0 2px #ffffff) drop-shadow(0 0 8px rgba(255, 255, 255, 0.85)) !important;
      }
    }

    /* Tối ưu giao diện trên thiết bị di động (Mobile) */
    @media only screen and (max-width: 600px) {
      .outer-wrapper {
        padding: 16px 8px !important;
      }
      .email-card {
        border-radius: 16px !important;
      }
      .header-section {
        padding: 24px 16px 14px !important;
      }
      .content-section {
        padding: 18px 20px 28px !important;
      }
      .heading-title {
        font-size: 21px !important;
        margin-bottom: 16px !important;
      }
      .otp-container {
        padding: 20px 12px !important;
        margin: 20px 0 !important;
      }
      .otp-number {
        font-size: 32px !important;
        letter-spacing: 6px !important;
        margin-right: -6px !important;
      }
      .footer-box {
        padding: 20px 16px !important;
        font-size: 11.5px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (preview tóm tắt chuyên nghiệp hiển thị ngay ngoài danh sách hộp thư đến) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0;">
    ${preview}
    &#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;
  </div>

  <div class="outer-wrapper" style="width: 100%; background-color: #f1f5f9; padding: 40px 16px; box-sizing: border-box;">
    <!-- Khung Card Email mở rộng thoáng đãng (680px) -->
    <div class="email-card" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 22px; overflow: hidden; box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
      
      <!-- Header với Logo EduHub: Hòa tự nhiên vào nền trắng, không khung viền -->
      <div class="header-section" style="padding: 38px 44px 16px; text-align: center;">
        <img class="logo-img" src="${logoUrl}" alt="EduHub" width="175" style="display: inline-block; width: 175px; max-width: 100%; height: auto; border: 0; filter: drop-shadow(0 0 1.5px #ffffff) drop-shadow(0 0 4px rgba(255, 255, 255, 0.6));" />
      </div>

      <!-- Nội dung email -->
      <div class="content-section" style="padding: 20px 44px 38px;">
        <!-- Tiêu đề căn giữa và tô màu xanh thương hiệu EduHub -->
        <h2 class="heading-title" style="margin: 0 0 20px; font-size: 24px; font-weight: 800; color: #1d4ed8; text-align: center; letter-spacing: -0.4px;">
          ${headingTitle}
        </h2>

        <p class="text-primary" style="margin: 0 0 14px; font-size: 15.5px; color: #334155; line-height: 1.65;">
          Xin chào <strong style="color: #1d4ed8; font-weight: 700;">${fullName}</strong>,
        </p>

        <p class="text-secondary" style="margin: 0 0 22px; font-size: 15px; color: #475569; line-height: 1.68;">
          ${leadMessage}
        </p>

        <!-- Khung hiển thị OTP chống tràn dòng, nổi bật trên cả mobile và desktop -->
        <div class="otp-container" style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 18px; padding: 24px 20px; text-align: center; margin: 24px 0; box-shadow: 0 4px 18px rgba(37, 99, 235, 0.07);">
          <div class="otp-badge" style="display: inline-block; background-color: #dbeafe; color: #1d4ed8; font-size: 11.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; border: 1px solid #bfdbfe; margin-bottom: 6px;">
            MÃ XÁC THỰC (OTP)
          </div>
          <div class="otp-number" style="font-size: 38px; font-weight: 800; letter-spacing: 8px; margin-right: -8px; color: #1d4ed8; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace; padding: 10px 0 6px; white-space: nowrap; word-break: keep-all; line-height: 1.2;">
            ${otp}
          </div>
          <div class="otp-timer" style="font-size: 13px; color: #4b5563; margin-top: 6px; font-weight: 500;">
            ⏱️ Mã có hiệu lực trong vòng <strong style="color: #2563eb; font-weight: 700;">${expiresInMinutes} phút</strong>
          </div>
        </div>

        <p class="text-secondary" style="margin: 0 0 22px; font-size: 14.5px; color: #475569; line-height: 1.65;">
          Vui lòng nhập mã xác thực này trên website EduHub để tiếp tục. Nhằm bảo vệ an toàn tài khoản, <span style="white-space: nowrap;"><strong style="color: #dc2626; font-weight: 700;">tuyệt đối không chia sẻ mã này</strong></span> cho bất kỳ ai, <span style="white-space: nowrap;">kể cả nhân viên hỗ trợ.</span>
        </p>

        <!-- Hộp cảnh báo bảo mật rộng thoáng, nổi bật -->
        <div class="security-box" style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 12px; margin-top: 24px;">
          <div class="security-title" style="font-size: 13.5px; font-weight: 700; color: #92400e; margin-bottom: 5px;">
            Lưu ý bảo mật:
          </div>
          <div class="security-desc" style="font-size: 13.5px; color: #78350f; line-height: 1.6;">
            Nếu bạn <strong>không</strong> thực hiện yêu cầu này, vui lòng bỏ qua email. Tài khoản EduHub của bạn vẫn được bảo vệ an toàn tuyệt đối.
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer-box" style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 22px 32px; text-align: center; font-size: 12.5px; color: #94a3b8; line-height: 1.6;">
        © 2026 <strong style="color: #2563eb;">EduHub</strong> · Nền tảng Quản lý &amp; Tổ chức Đào tạo Trực tuyến<br>
        Đây là email tự động gửi từ hệ thống bảo mật EduHub, vui lòng không phản hồi thư này.
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}
