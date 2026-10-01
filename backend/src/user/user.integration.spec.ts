import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service.js';
import { UserService } from './user.service.js';
import { UserRole, UserStatus } from '../generated/prisma/enums.js';

describe('UserService Real DB Integration Test', () => {
  let prisma: PrismaService;
  let service: UserService;
  let testUserId: bigint;
  const testEmail = `test_live_${Date.now()}@eduhub.com`;
  const initialPassword = 'initialPassword123';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new UserService(prisma);

    // Tạo user mẫu thực tế vào DB PostgreSQL
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const created = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: 'Người Dùng Test Thật',
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    testUserId = created.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.$disconnect();
  });

  it('1. Đọc profile thật từ DB (GET)', async () => {
    const profile = await service.getProfile(testUserId);
    expect(profile.id).toBe(testUserId.toString());
    expect(profile.email).toBe(testEmail);
    expect(profile.fullName).toBe('Người Dùng Test Thật');
    expect((profile as any).passwordHash).toBeUndefined();
  });

  it('2. Cập nhật họ tên thật vào DB (PATCH)', async () => {
    const updated = await service.updateProfile(testUserId, {
      fullName: 'Tên Đã Cập Nhật Thực Tế',
    });
    expect(updated.fullName).toBe('Tên Đã Cập Nhật Thực Tế');

    // Truy vấn DB thật để kiểm chứng dữ liệu đã lưu
    const dbRecord = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(dbRecord?.fullName).toBe('Tên Đã Cập Nhật Thực Tế');
  });

  it('3. Đổi mật khẩu thật vào DB (POST change-password)', async () => {
    const newPassword = 'newSecretPassword789';
    const result = await service.changePassword(testUserId, {
      currentPassword: initialPassword,
      newPassword,
    });
    expect(result.message).toBe('Đổi mật khẩu thành công');

    // Xác minh hash trong DB thật
    const dbRecord = await prisma.user.findUnique({ where: { id: testUserId } });
    const matchesNew = await bcrypt.compare(newPassword, dbRecord!.passwordHash);
    expect(matchesNew).toBe(true);

    const matchesOld = await bcrypt.compare(initialPassword, dbRecord!.passwordHash);
    expect(matchesOld).toBe(false);
  });
});
