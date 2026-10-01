import { apiFetch } from './http-client';
import type { UserProfile, UpdateProfilePayload, ChangePasswordPayload } from '../types/user';

export async function fetchUserProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me');
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function changeUserPassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
