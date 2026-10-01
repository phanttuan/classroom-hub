import type { UserRole, UserStatus } from '../../generated/prisma/enums.js';

export interface UserProfileResponseDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

