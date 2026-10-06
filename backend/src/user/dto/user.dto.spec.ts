import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProfileDto } from './update-profile.dto.js';
import { ChangePasswordDto } from './change-password.dto.js';

describe('User DTOs Validation', () => {
  describe('UpdateProfileDto', () => {
    it('should pass with valid full name', async () => {
      const dto = plainToInstance(UpdateProfileDto, { fullName: 'Nguyễn Văn A' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when fullName is too short or empty', async () => {
      const dto = plainToInstance(UpdateProfileDto, { fullName: 'A' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ChangePasswordDto', () => {
    it('should pass with valid password payload', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when newPassword is less than 8 characters', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'oldPassword123',
        newPassword: '123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
