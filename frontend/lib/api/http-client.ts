import { handleAuthError } from './handle-auth-error';

export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);

  if (response.status === 401 || response.status === 403) {
    handleAuthError(response.status);
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorData?.message || `Lỗi hệ thống: ${response.statusText}`);
  }

  return (await response.json()) as T;
}
