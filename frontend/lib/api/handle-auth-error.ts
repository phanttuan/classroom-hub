import { AUTH_COOKIE_NAME, ROLE_COOKIE_NAME } from '../auth/auth-constants';

export function handleAuthError(statusCode: number): void {
  if (typeof window === 'undefined') return;

  if (statusCode === 401) {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem(AUTH_COOKIE_NAME);
      sessionStorage.clear();
      document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${ROLE_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch {
      // Bỏ qua lỗi storage
    }

    const loginUrl = new URL('/login', window.location.origin);
    loginUrl.searchParams.set(
      'callbackUrl',
      `${window.location.pathname}${window.location.search}`,
    );
    window.location.assign(loginUrl.toString());
  } else if (statusCode === 403) {
    const forbiddenUrl = new URL('/forbidden', window.location.origin);
    window.location.assign(forbiddenUrl.toString());
  }
}
