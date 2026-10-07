import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { UserRole, UserStatus, ClassStatus } from '../src/generated/prisma/enums.js';
import bcrypt from 'bcryptjs';

describe('Class Management Permissions & Authorization (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let teacherA: { id: bigint; token: string };
  let teacherB: { id: bigint; token: string };
  let student: { id: bigint; token: string };
  let classOfTeacherAId: bigint;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    const passwordHash = await bcrypt.hash('secretPass123', 10);
    const now = Date.now();

    const jwtSecret =
      process.env.JWT_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      'eduhub_super_secret_jwt_access_key_2026_dev_hcmute';

    // 1. Tạo Giáo viên A
    const tA = await prisma.user.create({
      data: {
        email: `teacher_a_${now}@eduhub.com`,
        fullName: 'Giáo Viên A',
        passwordHash,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
      },
    });
    const tokenA = jwtService.sign(
      { sub: tA.id.toString(), role: tA.role, email: tA.email },
      { secret: jwtSecret },
    );
    teacherA = { id: tA.id, token: tokenA };

    // 2. Tạo Giáo viên B
    const tB = await prisma.user.create({
      data: {
        email: `teacher_b_${now}@eduhub.com`,
        fullName: 'Giáo Viên B',
        passwordHash,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
      },
    });
    const tokenB = jwtService.sign(
      { sub: tB.id.toString(), role: tB.role, email: tB.email },
      { secret: jwtSecret },
    );
    teacherB = { id: tB.id, token: tokenB };

    // 3. Tạo Học sinh
    const stu = await prisma.user.create({
      data: {
        email: `student_${now}@eduhub.com`,
        fullName: 'Học Sinh C',
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    const tokenStu = jwtService.sign(
      { sub: stu.id.toString(), role: stu.role, email: stu.email },
      { secret: jwtSecret },
    );
    student = { id: stu.id, token: tokenStu };
  });

  afterAll(async () => {
    if (classOfTeacherAId) {
      await prisma.classroom.deleteMany({ where: { id: classOfTeacherAId } });
    }
    if (teacherA?.id) await prisma.user.deleteMany({ where: { id: teacherA.id } });
    if (teacherB?.id) await prisma.user.deleteMany({ where: { id: teacherB.id } });
    if (student?.id) await prisma.user.deleteMany({ where: { id: student.id } });
    await app.close();
  });

  describe('1. Quyền tạo lớp học (POST /classes)', () => {
    it('Chưa đăng nhập -> 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/classes')
        .send({ name: 'Lớp Không Token' });

      expect(res.status).toBe(401);
    });

    it('Học sinh cố tình tạo lớp -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/classes')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ name: 'Lớp Do Học Sinh Tạo' });

      expect(res.status).toBe(403);
    });

    it('Giáo viên A tạo lớp hợp lệ -> 201 Created', async () => {
      const res = await request(app.getHttpServer())
        .post('/classes')
        .set('Authorization', `Bearer ${teacherA.token}`)
        .send({
          name: 'Lớp Học Của Thầy A',
          description: 'Mô tả lớp học',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.classCode).toHaveLength(8);
      classOfTeacherAId = BigInt(res.body.data.id);
    });
  });

  describe('2. Quyền chỉnh sửa thông tin lớp (PATCH /classes/:classId)', () => {
    it('Học sinh cố tình sửa lớp -> 403 Forbidden (ClassOwnerGuard)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/classes/${classOfTeacherAId}`)
        .set('Authorization', `Bearer ${student.token}`)
        .send({ name: 'Học sinh đổi tên' });

      expect(res.status).toBe(403);
    });

    it('Giáo viên B cố tình sửa lớp của Giáo viên A -> 403 Forbidden (ClassOwnerGuard)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/classes/${classOfTeacherAId}`)
        .set('Authorization', `Bearer ${teacherB.token}`)
        .send({ name: 'Giáo viên B đổi tên trái phép' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('không phải là giáo viên sở hữu');
    });

    it('Chính chủ Giáo viên A sửa lớp của mình -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/classes/${classOfTeacherAId}`)
        .set('Authorization', `Bearer ${teacherA.token}`)
        .send({ name: 'Tên Lớp Đã Được Thầy A Sửa' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Tên Lớp Đã Được Thầy A Sửa');
    });
  });

  describe('3. Quyền chuyển trạng thái Đóng / Lưu trữ (PATCH /classes/:classId/status)', () => {
    it('Giáo viên B cố tình đóng lớp của Giáo viên A -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/classes/${classOfTeacherAId}/status`)
        .set('Authorization', `Bearer ${teacherB.token}`)
        .send({ status: ClassStatus.CLOSED });

      expect(res.status).toBe(403);
    });

    it('Chính chủ Giáo viên A đóng lớp của mình -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/classes/${classOfTeacherAId}/status`)
        .set('Authorization', `Bearer ${teacherA.token}`)
        .send({ status: ClassStatus.CLOSED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ClassStatus.CLOSED);
    });
  });
});

