import { toast } from '@/app/components/common/Toast';
import { AUTH_COOKIE_NAME, ROLE_COOKIE_NAME } from './auth/auth-constants';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface LogoutOptions {
  /**
   * Đăng xuất khỏi toàn bộ các thiết bị (true) hay chỉ thiết bị hiện tại (false)
   * Mặc định: false
   */
  allDevices?: boolean;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
  data?: {
    allDevices: boolean;
    revokedSessions: number;
  };
}

/**
 * Lưu thông tin session và token vào Cookie / Storage để Next.js proxy và giao diện nhận diện ngay lập tức
 */
export function saveAuthSession(
  tokens?: { accessToken?: string; refreshToken?: string },
  user?: { id?: string | bigint; email?: string; fullName?: string; role?: string },
) {
  if (typeof window === 'undefined') return;

  const accessToken = tokens?.accessToken;
  if (accessToken) {
    document.cookie = `${AUTH_COOKIE_NAME}=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
    localStorage.setItem(AUTH_COOKIE_NAME, accessToken);
  }

  if (user) {
    if (user.role) {
      document.cookie = `${ROLE_COOKIE_NAME}=${user.role}; path=/; max-age=86400; SameSite=Lax`;
    }
    localStorage.setItem('user', JSON.stringify(user));
  }
}

/**
 * Gọi API Đăng xuất bảo mật
 * - Gửi kèm HttpOnly cookie credentials: 'include'
 * - Xóa sạch thông tin phiên lưu trữ cục bộ
 * - Kích hoạt Toast thông báo phiên làm việc đã đóng an toàn
 * - Trả về kết quả từ máy chủ
 */
export async function logoutUser(
  options: LogoutOptions = {},
): Promise<LogoutResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Đảm bảo trình duyệt tự động gửi và nhận chỉ thị xóa HttpOnly Cookie
      body: JSON.stringify({
        allDevices: options.allDevices ?? false,
      }),
    });

    const result = await response.json();

    // Dọn dẹp local storage, session storage và cookies client-side
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('user');
        localStorage.removeItem(AUTH_COOKIE_NAME);
        sessionStorage.clear();

        document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `${ROLE_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      } catch {
        // Bỏ qua nếu môi trường cấm storage
      }
    }

    // Đặt flash toast để trang đích (/login) hiển thị thông báo đăng xuất
    toast.flash(
      'info',
      'Đăng xuất thành công',
      'Phiên làm việc của bạn đã được đóng an toàn.',
      { icon: 'logout' },
    );

    return result;
  } catch (error: any) {
    // Luôn dọn dẹp client-side ngay cả khi mạng có sự cố
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('user');
        localStorage.removeItem(AUTH_COOKIE_NAME);
        sessionStorage.clear();

        document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `${ROLE_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      } catch {
        // Bỏ qua
      }
    }

    return {
      success: true, // Vẫn trả về true để client cho phép redirect về login êm đẹp
      message: 'Đã đóng phiên đăng nhập cục bộ.',
    };
  }
}
