import { handleAuthError } from './handle-auth-error';
import { AUTH_COOKIE_NAME } from '../auth/auth-constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + AUTH_COOKIE_NAME + '=([^;]+)'));
  if (match) return match[2];
  return localStorage.getItem(AUTH_COOKIE_NAME);
}

export interface ApiFetchOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: ApiFetchOptions
): Promise<T> {
  // 1. Tự động ghép tiền tố API_BASE_URL nếu truyền đường dẫn tương đối (vd: '/profile')
  let url = input;
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      url = input;
    } else {
      const normalizedPath = input.startsWith('/') ? input : `/${input}`;
      url = `${API_BASE_URL}${normalizedPath}`;
    }
  }

  // 2. Tự động set Content-Type là application/json khi gửi data
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // 3. Tự động gắn Authorization: Bearer <token> từ Cookie/LocalStorage
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 4. Thực hiện gọi API với credentials: 'include' để tự động gửi nhận HttpOnly Cookies bảo mật
  let response = await fetch(url, {
    ...init,
    credentials: init?.credentials || 'include',
    headers,
  });

  // 5. Tự động làm mới phiên (Silent Refresh) nếu Access Token hết hạn (401)
  if (response.status === 401 && typeof window !== 'undefined') {
    const isRefreshOrAuthUrl =
      typeof input === 'string' &&
      (input.includes('/auth/refresh') || input.includes('/auth/login') || input.includes('/auth/register'));

    if (!isRefreshOrAuthUrl) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshRes.ok) {
          // Làm mới token thành công -> Backend đã cấp Set-Cookie mới -> Gọi lại API ban đầu
          response = await fetch(url, {
            ...init,
            credentials: init?.credentials || 'include',
            headers,
          });
        }
      } catch {
        // Lỗi kết nối mạng khi refresh, tiếp tục xử lý bên dưới
      }
    }
  }

  // 6. Bắt lỗi 401/403 của auth-guard khi không thể khôi phục phiên (trừ khi yêu cầu bỏ qua chuyển hướng)
  if ((response.status === 401 || response.status === 403) && !init?.skipAuthRedirect) {
    handleAuthError(response.status);
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorData?.message || `Lỗi hệ thống: ${response.statusText}`);
  }

  return (await response.json()) as T;
}