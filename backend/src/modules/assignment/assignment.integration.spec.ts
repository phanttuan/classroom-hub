import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../../app.module.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  CourseStatus,
  EnrollmentStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';

describe('Assignment Controller & Guards Integration Matrix', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let teacherOwner: { id: bigint; token: string };
  let teacherOther: { id: bigint; token: string };
  let studentMember: { id: bigint; token: string };
  let studentNonMember: { id: bigint; token: string };
  let courseId: bigint;
  let draftAssignmentId: string;

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

    const createUserWithToken = async (
      prefix: string,
      fullName: string,
      role: UserRole,
    ) => {
      const user = await prisma.user.create({
        data: {
          email: `${prefix}_${now}@eduhub.com`,
          fullName,
          passwordHash,
          role,
          status: UserStatus.ACTIVE,
        },
      });
      const token = jwtService.sign(
        { sub: user.id.toString(), role: user.role, email: user.email },
        { secret: jwtSecret },
      );
      return { id: user.id, token };
    };

    teacherOwner = await createUserWithToken(
      'asgn_t_owner',
      'Giáo Viên Sở Hữu',
      UserRole.TEACHER,
    );
    teacherOther = await createUserWithToken(
      'asgn_t_other',
      'Giáo Viên Khác',
      UserRole.TEACHER,
    );
    studentMember = await createUserWithToken(
      'asgn_s_member',
      'Sinh Viên Thành Viên',
      UserRole.STUDENT,
    );
    studentNonMember = await createUserWithToken(
      'asgn_s_outsider',
      'Sinh Viên Ngoài Khóa',
      UserRole.STUDENT,
    );

    const course = await prisma.course.create({
      data: {
        name: 'Khóa học Kiểm thử Bài tập',
        courseCode: `ASG${now.toString().slice(-5)}`,
        ownerId: teacherOwner.id,
        status: CourseStatus.ACTIVE,
      },
    });
    courseId = course.id;

    await prisma.enrollment.create({
      data: {
        courseId,
        studentId: studentMember.id,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    const testModule = await prisma.module.create({
      data: {
        courseId,
        title: 'Chủ đề 1',
        orderIndex: 1,
      },
    });

    // Tạo sẵn 1 bài tập DRAFT bằng quyền giáo viên sở hữu
    const createRes = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/assignments`)
      .set('Authorization', `Bearer ${teacherOwner.token}`)
      .send({
        moduleId: testModule.id.toString(),
        title: 'Bài tập Nháp Kiểm Thử Guard',
        description: 'Mô tả chi tiết',
        maxScore: 10,
        openAt: '2026-10-15T08:00:00.000Z',
        dueAt: '2026-10-25T23:59:59.000Z',
      });

    expect(createRes.status).toBe(201);
    draftAssignmentId = createRes.body.data.id;
  });

  afterAll(async () => {
    if (courseId) {
      await prisma.gradeItem.deleteMany({ where: { courseId } });
      await prisma.assignment.deleteMany({ where: { courseId } });
      await prisma.module.deleteMany({ where: { courseId } });
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    const userIds = [
      teacherOwner?.id,
      teacherOther?.id,
      studentMember?.id,
      studentNonMember?.id,
    ].filter((id): id is bigint => Boolean(id));
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it('Student gọi POST /courses/:courseId/assignments -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/assignments`)
      .set('Authorization', `Bearer ${studentMember.token}`)
      .send({
        title: 'Bài tập Sinh Viên Tự Tạo',
        maxScore: 10,
        openAt: '2026-10-15T08:00:00.000Z',
        dueAt: '2026-10-25T23:59:59.000Z',
      });

    expect(res.status).toBe(403);
  });

  it('Non-member gọi GET /courses/:courseId/assignments -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/courses/${courseId.toString()}/assignments`)
      .set('Authorization', `Bearer ${studentNonMember.token}`);

    expect(res.status).toBe(403);
  });

  it('Teacher khóa học khác gọi PATCH /courses/:courseId/assignments/:assignmentId -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/courses/${courseId.toString()}/assignments/${draftAssignmentId}`)
      .set('Authorization', `Bearer ${teacherOther.token}`)
      .send({ title: 'Sửa trái phép' });

    expect(res.status).toBe(403);
  });

  it('Student trong khóa học gọi GET /:assignmentId khi còn DRAFT -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/courses/${courseId.toString()}/assignments/${draftAssignmentId}`)
      .set('Authorization', `Bearer ${studentMember.token}`);

    expect(res.status).toBe(403);
  });
});

