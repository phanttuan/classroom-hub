export function handleAuthError(statusCode: number): void {
  if (typeof window === 'undefined') return;

  if (statusCode === 401) {
    const loginUrl = new URL('/login', window.location.origin);
    loginUrl.searchParams.set('callbackUrl', window.location.pathname);
    window.location.assign(loginUrl.toString());
  } else if (statusCode === 403) {
    const forbiddenUrl = new URL('/forbidden', window.location.origin);
    window.location.assign(forbiddenUrl.toString());
  }
}
