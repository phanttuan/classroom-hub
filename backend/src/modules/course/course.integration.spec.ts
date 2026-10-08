import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service.js';
import { CourseService } from './course.service.js';
import { UserRole, UserStatus, CourseStatus, EnrollmentStatus } from '../../generated/prisma/enums.js';
import { ConflictException } from '@nestjs/common';

describe('CourseService Real DB Integration Test', () => {
  let prisma: PrismaService;
  let service: CourseService;
  let testTeacherId: bigint;
  let testStudentId: bigint;
  let testCourseId: bigint;
  let testCourseCode: string;
  const testEmail = `teacher_test_${Date.now()}@eduhub.com`;
  const testStudentEmail = `student_test_${Date.now()}@eduhub.com`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new CourseService(prisma);

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

    const student = await prisma.user.create({
      data: {
        email: testStudentEmail,
        fullName: 'Sinh Viên Test',
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    testStudentId = student.id;
  });

  afterAll(async () => {
    if (testCourseId) {
      await prisma.enrollment.deleteMany({ where: { courseId: testCourseId } });
      await prisma.course.deleteMany({ where: { id: testCourseId } });
    }
    if (testTeacherId) {
      await prisma.user.deleteMany({ where: { id: testTeacherId } });
    }
    if (testStudentId) {
      await prisma.user.deleteMany({ where: { id: testStudentId } });
    }
    await prisma.$disconnect();
  });

  it('1. Giáo viên tạo lớp học mới (POST /courses)', async () => {
    const created = await service.create(testTeacherId, {
      name: 'Môn Lập Trình TypeScript',
      description: 'Lớp học TypeScript chuyên sâu',
    });

    expect(created.id).toBeDefined();
    expect(created.courseCode).toHaveLength(8);
    expect(created.status).toBe(CourseStatus.ACTIVE);
    expect(created.name).toBe('Môn Lập Trình TypeScript');
    testCourseId = created.id;
    testCourseCode = created.courseCode;
  });

  it('2. Giáo viên chỉnh sửa thông tin lớp học (PATCH /courses/:courseId)', async () => {
    const updated = await service.update(testCourseId, {
      name: 'Môn Lập Trình TypeScript Nâng Cao',
      description: 'Cập nhật mô tả mới',
    });

    expect(updated.name).toBe('Môn Lập Trình TypeScript Nâng Cao');
    expect(updated.description).toBe('Cập nhật mô tả mới');
  });

  it('3. Đóng lớp học (PATCH /courses/:courseId/status -> CLOSED)', async () => {
    const closed = await service.changeStatus(testCourseId, {
      status: CourseStatus.CLOSED,
    });
    expect(closed.status).toBe(CourseStatus.CLOSED);
  });

  it('4. Lưu trữ lớp học (PATCH /courses/:courseId/status -> ARCHIVED)', async () => {
    const archived = await service.changeStatus(testCourseId, {
      status: CourseStatus.ARCHIVED,
    });
    expect(archived.status).toBe(CourseStatus.ARCHIVED);
  });

  it('5. Chặn chỉnh sửa tên/mô tả khi lớp ARCHIVED', async () => {
    await expect(
      service.update(testCourseId, { name: 'Thử đổi tên khi lưu trữ' }),
    ).rejects.toThrow(ConflictException);
  });

  it('6. Khôi phục lớp học về ACTIVE (Restore)', async () => {
    const restored = await service.changeStatus(testCourseId, {
      status: CourseStatus.ACTIVE,
    });
    expect(restored.status).toBe(CourseStatus.ACTIVE);

    // Sau khi khôi phục, có thể chỉnh sửa lại bình thường
    const editedAgain = await service.update(testCourseId, {
      name: 'Môn Lập Trình Đã Khôi Phục',
    });
    expect(editedAgain.name).toBe('Môn Lập Trình Đã Khôi Phục');
  });

  it('7. Xem danh sách lớp của giáo viên', async () => {
    const result = await service.findTeacherCourses(testTeacherId, {
      status: 'ACTIVE',
    });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items.some((c) => c.id === testCourseId)).toBe(true);
  });

  it('8. Sinh viên tham gia lớp bằng mã mời (POST /courses/join)', async () => {
    const joinResult = await service.joinCourse(testStudentId, testCourseCode);
    expect(joinResult.isReactivated).toBe(false);
    expect(joinResult.course.id).toBe(testCourseId);
    expect(joinResult.enrollment.status).toBe(EnrollmentStatus.ACTIVE);
  });

  it('9. Sinh viên xem danh sách lớp đang tham gia (GET /courses)', async () => {
    const studentCourses = await service.findStudentCourses(testStudentId, {});
    expect(studentCourses.items.length).toBeGreaterThanOrEqual(1);
    expect(studentCourses.items.some((c) => c.id === testCourseId)).toBe(true);
    expect(studentCourses.items[0].owner.email).toBe(testEmail);
  });

  it('10. Sinh viên cố tham gia lại lớp đã là thành viên -> 409 Conflict', async () => {
    await expect(
      service.joinCourse(testStudentId, testCourseCode),
    ).rejects.toThrow(ConflictException);
  });

  it('11. Sinh viên bị xóa khỏi lớp sau đó tham gia lại -> Tái kích hoạt và giữ dữ liệu (BR-EDU-021)', async () => {
    // Giả lập giáo viên xóa sinh viên khỏi môn học
    await prisma.enrollment.updateMany({
      where: { courseId: testCourseId, studentId: testStudentId },
      data: { status: EnrollmentStatus.REMOVED, removedAt: new Date() },
    });

    // Sinh viên nhập mã tham gia lại
    const rejoinResult = await service.joinCourse(testStudentId, testCourseCode);
    expect(rejoinResult.isReactivated).toBe(true);
    expect(rejoinResult.enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(rejoinResult.enrollment.removedAt).toBeNull();

    // Kiểm tra sinh viên lại xuất hiện trong danh sách môn của mình
    const studentCourses = await service.findStudentCourses(testStudentId, {});
    expect(studentCourses.items.some((c) => c.id === testCourseId)).toBe(true);
  });
});

