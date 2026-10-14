import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import {
  ActivityStatus,
  CourseStatus,
  EnrollmentStatus,
  GradeCategory,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/enums.js';

describe('Assignment Full Lifecycle (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let teacher: { id: bigint; token: string };
  let student: { id: bigint; token: string };
  let courseId: bigint;
  let moduleId: bigint;
  let assignmentId: string;
  let gradeItemId: string;

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

    const passwordHash = await bcrypt.hash('Password123@', 10);
    const now = Date.now();
    const jwtSecret =
      process.env.JWT_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      'eduhub_super_secret_jwt_access_key_2026_dev_hcmute';

    const tUser = await prisma.user.create({
      data: {
        email: `e2e_asgn_teacher_${now}@eduhub.com`,
        fullName: 'Giáo Viên E2E Bài Tập',
        passwordHash,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
      },
    });
    teacher = {
      id: tUser.id,
      token: jwtService.sign(
        { sub: tUser.id.toString(), role: tUser.role, email: tUser.email },
        { secret: jwtSecret },
      ),
    };

    const sUser = await prisma.user.create({
      data: {
        email: `e2e_asgn_student_${now}@eduhub.com`,
        fullName: 'Sinh Viên E2E Bài Tập',
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    student = {
      id: sUser.id,
      token: jwtService.sign(
        { sub: sUser.id.toString(), role: sUser.role, email: sUser.email },
        { secret: jwtSecret },
      ),
    };

    const course = await prisma.course.create({
      data: {
        name: 'Khóa học E2E Assignment',
        courseCode: `E2E${now.toString().slice(-5)}`,
        ownerId: teacher.id,
        status: CourseStatus.ACTIVE,
      },
    });
    courseId = course.id;

    const testModule = await prisma.module.create({
      data: {
        courseId,
        title: 'Chủ đề E2E',
        orderIndex: 1,
      },
    });
    moduleId = testModule.id;

    await prisma.enrollment.create({
      data: {
        courseId,
        studentId: student.id,
        status: EnrollmentStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    if (courseId) {
      await prisma.gradeItem.deleteMany({ where: { courseId } });
      await prisma.assignment.deleteMany({ where: { courseId } });
      await prisma.module.deleteMany({ where: { courseId } });
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    if (teacher?.id) await prisma.user.deleteMany({ where: { id: teacher.id } });
    if (student?.id) await prisma.user.deleteMany({ where: { id: student.id } });
    await app.close();
  });

  it('1. Giáo viên tạo bài tập mới (DRAFT) kèm GradeItem cùng transaction', async () => {
    const res = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/assignments`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        moduleId: moduleId.toString(),
        title: 'Bài tập E2E Số 1',
        description: 'Xây dựng module Assignment',
        maxScore: 10,
        openAt: '2026-10-15T08:00:00.000Z',
        dueAt: '2026-10-25T23:59:59.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      title: 'Bài tập E2E Số 1',
      description: 'Xây dựng module Assignment',
      maxScore: '10.00',
      status: ActivityStatus.DRAFT,
      courseId: courseId.toString(),
      moduleId: moduleId.toString(),
      createdBy: teacher.id.toString(),
    });
    expect(typeof res.body.data.id).toBe('string');
    expect(typeof res.body.data.gradeItemId).toBe('string');

    assignmentId = res.body.data.id;
    gradeItemId = res.body.data.gradeItemId;

    const dbGradeItem = await prisma.gradeItem.findUnique({
      where: { id: BigInt(gradeItemId) },
    });
    expect(dbGradeItem).not.toBeNull();
    expect(dbGradeItem?.category).toBe(GradeCategory.ASSIGNMENT);
    expect(dbGradeItem?.maxScore.toFixed(2)).toBe('10.00');
  });

  it('2. Khi bài tập đang DRAFT, sinh viên gọi danh sách sẽ không thấy bài tập này', async () => {
    const res = await request(app.getHttpServer())
      .get(`/courses/${courseId.toString()}/assignments`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('3. Giáo viên cập nhật maxScore khi DRAFT -> GradeItem.maxScore được đồng bộ', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/courses/${courseId.toString()}/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        maxScore: 15.5,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.maxScore).toBe('15.50');

    const dbGradeItem = await prisma.gradeItem.findUnique({
      where: { id: BigInt(gradeItemId) },
    });
    expect(dbGradeItem?.maxScore.toFixed(2)).toBe('15.50');
  });

  it('4. Giáo viên xuất bản bài tập (publish) -> chuyển sang PUBLISHED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/assignments/${assignmentId}/publish`)
      .set('Authorization', `Bearer ${teacher.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ActivityStatus.PUBLISHED);
    expect(res.body.data.publishedAt).toBeTruthy();
  });

  it('5. Sinh viên lấy danh sách bài tập thấy bài PUBLISHED kèm mySubmission: null', async () => {
    const res = await request(app.getHttpServer())
      .get(`/courses/${courseId.toString()}/assignments`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: assignmentId,
      title: 'Bài tập E2E Số 1',
      maxScore: '15.50',
      status: ActivityStatus.PUBLISHED,
      mySubmission: null,
    });
  });

  it('6. Giáo viên đóng bài tập (close) -> chuyển sang CLOSED, sửa lại bị chặn 409', async () => {
    const closeRes = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/assignments/${assignmentId}/close`)
      .set('Authorization', `Bearer ${teacher.token}`);

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe(ActivityStatus.CLOSED);

    const patchAfterClose = await request(app.getHttpServer())
      .patch(`/courses/${courseId.toString()}/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ title: 'Sửa sau khi đóng' });

    expect(patchAfterClose.status).toBe(409);
  });
});

