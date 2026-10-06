import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { UserRole, UserStatus } from '../generated/prisma/enums.js';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: Partial<UserService>;

  const req = {
    user: {
      id: '1',
      email: 'user@eduhub.com',
      role: UserRole.STUDENT,
    },
  };

  beforeEach(() => {
    mockUserService = {
      getProfile: vi.fn().mockResolvedValue({
        id: '1',
        email: 'user@eduhub.com',
        fullName: 'Học Sinh A',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
      }),
      updateProfile: vi.fn().mockResolvedValue({
        id: '1',
        email: 'user@eduhub.com',
        fullName: 'Học Sinh B',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
      }),
      changePassword: vi.fn().mockResolvedValue({ message: 'Đổi mật khẩu thành công' }),
    };

    controller = new UserController(mockUserService as UserService);
  });

  it('should get current user profile', async () => {
    const result = await controller.getProfile(req as any);
    expect(result.fullName).toBe('Học Sinh A');
    expect(mockUserService.getProfile).toHaveBeenCalledWith(BigInt(1));
  });

  it('should update current user profile', async () => {
    const result = await controller.updateProfile(req as any, { fullName: 'Học Sinh B' });
    expect(result.fullName).toBe('Học Sinh B');
    expect(mockUserService.updateProfile).toHaveBeenCalledWith(BigInt(1), { fullName: 'Học Sinh B' });
  });

  it('should change password', async () => {
    const result = await controller.changePassword(req as any, {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    });
    expect(result.message).toBe('Đổi mật khẩu thành công');
    expect(mockUserService.changePassword).toHaveBeenCalledWith(BigInt(1), {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    });
  });
});
