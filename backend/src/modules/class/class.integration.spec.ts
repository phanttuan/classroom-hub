import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service.js';
import { ClassService } from './class.service.js';
import { UserRole, UserStatus, ClassStatus } from '../../generated/prisma/enums.js';
import { ConflictException } from '@nestjs/common';

describe('ClassService Real DB Integration Test', () => {
  let prisma: PrismaService;
  let service: ClassService;
  let testTeacherId: bigint;
  let testClassId: bigint;
  const testEmail = `teacher_test_${Date.now()}@eduhub.com`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new ClassService(prisma);

    const passwordHash = await bcrypt.hash('teacherPass123', 10);
    const teacher = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: 'Giáo Viên Test',
        passwordHash,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
      },
    });
    testTeacherId = teacher.id;
  });

  afterAll(async () => {
    if (testClassId) {
      await prisma.classroom.deleteMany({ where: { id: testClassId } });
    }
    if (testTeacherId) {
      await prisma.user.deleteMany({ where: { id: testTeacherId } });
    }
    await prisma.$disconnect();
  });

  it('1. Giáo viên tạo lớp mới (POST /classes)', async () => {
    const created = await service.create(testTeacherId, {
      name: 'Lớp Lập Trình TypeScript',
      description: 'Khóa học TypeScript chuyên sâu',
    });

    expect(created.id).toBeDefined();
    expect(created.classCode).toHaveLength(8);
    expect(created.status).toBe(ClassStatus.ACTIVE);
    expect(created.name).toBe('Lớp Lập Trình TypeScript');
    testClassId = created.id;
  });

  it('2. Giáo viên chỉnh sửa thông tin lớp (PATCH /classes/:classId)', async () => {
    const updated = await service.update(testClassId, {
      name: 'Lớp Lập Trình TypeScript Nâng Cao',
      description: 'Cập nhật mô tả mới',
    });

    expect(updated.name).toBe('Lớp Lập Trình TypeScript Nâng Cao');
    expect(updated.description).toBe('Cập nhật mô tả mới');
  });

  it('3. Đóng lớp học (PATCH /classes/:classId/status -> CLOSED)', async () => {
    const closed = await service.changeStatus(testClassId, {
      status: ClassStatus.CLOSED,
    });
    expect(closed.status).toBe(ClassStatus.CLOSED);
  });

  it('4. Lưu trữ lớp học (PATCH /classes/:classId/status -> ARCHIVED)', async () => {
    const archived = await service.changeStatus(testClassId, {
      status: ClassStatus.ARCHIVED,
    });
    expect(archived.status).toBe(ClassStatus.ARCHIVED);
  });

  it('5. Chặn chỉnh sửa tên/mô tả khi lớp ARCHIVED', async () => {
    await expect(
      service.update(testClassId, { name: 'Thử đổi tên khi lưu trữ' }),
    ).rejects.toThrow(ConflictException);
  });

  it('6. Khôi phục lớp học về ACTIVE (Restore)', async () => {
    const restored = await service.changeStatus(testClassId, {
      status: ClassStatus.ACTIVE,
    });
    expect(restored.status).toBe(ClassStatus.ACTIVE);

    // Sau khi khôi phục, có thể chỉnh sửa lại bình thường
    const editedAgain = await service.update(testClassId, {
      name: 'Lớp Lập Trình Đã Khôi Phục',
    });
    expect(editedAgain.name).toBe('Lớp Lập Trình Đã Khôi Phục');
  });

  it('7. Xem danh sách lớp của giáo viên', async () => {
    const result = await service.findTeacherClasses(testTeacherId, {
      status: 'ACTIVE',
    });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items.some((c) => c.id === testClassId)).toBe(true);
  });
});

