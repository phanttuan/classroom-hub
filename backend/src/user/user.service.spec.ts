import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UserService } from './user.service.js';
import { UserRole, UserStatus } from '../generated/prisma/enums.js';

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: any;

  const mockUser = {
    id: BigInt(1),
    email: 'teacher@eduhub.com',
    fullName: 'Thầy Giáo A',
    passwordHash: '',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('oldPassword123', 10);
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new UserService(mockPrisma);
  });

  describe('getProfile', () => {
    it('should return user profile without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getProfile(BigInt(1));

      expect(result.id).toBe('1');
      expect(result.email).toBe('teacher@eduhub.com');
      expect(result.fullName).toBe('Thầy Giáo A');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile(BigInt(999))).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update and return new fullName', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, fullName: 'Thầy Giáo B' });

      const result = await service.updateProfile(BigInt(1), { fullName: 'Thầy Giáo B' });
      expect(result.fullName).toBe('Thầy Giáo B');
    });

    it('should throw NotFoundException if user not found when updating', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateProfile(BigInt(999), { fullName: 'Thầy Giáo B' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password when current password matches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword(BigInt(1), {
        currentPassword: 'oldPassword123',
        newPassword: 'newSecretPassword456',
      });

      expect(result.message).toBe('Đổi mật khẩu thành công');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.changePassword(BigInt(1), {
          currentPassword: 'wrongPassword',
          newPassword: 'newSecretPassword456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password matches old password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.changePassword(BigInt(1), {
          currentPassword: 'oldPassword123',
          newPassword: 'oldPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found when changing password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(BigInt(999), {
          currentPassword: 'oldPassword123',
          newPassword: 'newSecretPassword456',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
