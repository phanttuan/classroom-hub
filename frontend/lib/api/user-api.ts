import { apiFetch } from './http-client';
import type { UserProfile, UpdateProfilePayload, ChangePasswordPayload } from '../types/user';

interface ApiEnvelope<T> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: T;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await apiFetch<ApiEnvelope<UserProfile> | UserProfile>('/users/me');
  if (res && typeof res === 'object' && 'data' in res && (res as ApiEnvelope<UserProfile>).data) {
    return (res as ApiEnvelope<UserProfile>).data;
  }
  return res as UserProfile;
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const res = await apiFetch<ApiEnvelope<UserProfile> | UserProfile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (res && typeof res === 'object' && 'data' in res && (res as ApiEnvelope<UserProfile>).data) {
    return (res as ApiEnvelope<UserProfile>).data;
  }
  return res as UserProfile;
}

export async function changeUserPassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const res = await apiFetch<ApiEnvelope<{ message: string }> | { message: string }>('/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res && typeof res === 'object' && 'data' in res && (res as ApiEnvelope<{ message: string }>).data) {
    return (res as ApiEnvelope<{ message: string }>).data;
  }
  return res as { message: string };
}
