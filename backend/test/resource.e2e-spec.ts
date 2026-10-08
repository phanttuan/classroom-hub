import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import {
  UserRole,
  UserStatus,
  LessonStatus,
  EnrollmentStatus,
  ResourceParent,
} from '../src/generated/prisma/enums.js';
import bcrypt from 'bcryptjs';

describe('Resource Preview & Download Endpoints (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let teacherUser: { id: bigint; token: string };
  let studentUser: { id: bigint; token: string };
  let unenrolledUser: { id: bigint; token: string };

  let courseId: bigint;
  let moduleId: bigint;
  let publishedLessonId: bigint;
  let draftLessonId: bigint;
  let publishedResourceId: bigint;
  let draftResourceId: bigint;

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

    // Giáo viên
    const teacher = await prisma.user.create({
      data: {
        email: `teacher_res_${now}@eduhub.com`,
        fullName: 'GV E2E Resource',
        passwordHash,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
      },
    });
    teacherUser = {
      id: teacher.id,
      token: jwtService.sign(
        { sub: teacher.id.toString(), role: teacher.role, email: teacher.email },
        { secret: jwtSecret },
      ),
    };

    // Sinh viên 1 (tham gia môn)
    const student = await prisma.user.create({
      data: {
        email: `student_res_${now}@eduhub.com`,
        fullName: 'SV E2E Resource Enrolled',
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    studentUser = {
      id: student.id,
      token: jwtService.sign(
        { sub: student.id.toString(), role: student.role, email: student.email },
        { secret: jwtSecret },
      ),
    };

    // Sinh viên 2 (không tham gia môn)
    const unenrolled = await prisma.user.create({
      data: {
        email: `unenrolled_res_${now}@eduhub.com`,
        fullName: 'SV E2E Unenrolled',
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    unenrolledUser = {
      id: unenrolled.id,
      token: jwtService.sign(
        {
          sub: unenrolled.id.toString(),
          role: unenrolled.role,
          email: unenrolled.email,
        },
        { secret: jwtSecret },
      ),
    };

    // Tạo môn học
    const course = await prisma.course.create({
      data: {
        name: 'Môn E2E Tài liệu',
        courseCode: `E2E${now.toString().slice(-5)}`,
        ownerId: teacherUser.id,
      },
    });
    courseId = course.id;

    // Sinh viên 1 tham gia môn học
    await prisma.enrollment.create({
      data: {
        courseId,
        studentId: studentUser.id,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    // Tạo module & lessons
    const module = await prisma.module.create({
      data: {
        courseId,
        title: 'Chương E2E',
        orderIndex: 1,
      },
    });
    moduleId = module.id;

    const pubLesson = await prisma.lesson.create({
      data: {
        moduleId,
        title: 'Bài học đã công bố',
        content: 'Nội dung',
        orderIndex: 1,
        status: LessonStatus.PUBLISHED,
      },
    });
    publishedLessonId = pubLesson.id;

    const drfLesson = await prisma.lesson.create({
      data: {
        moduleId,
        title: 'Bài học bản nháp',
        content: 'Nội dung nháp',
        orderIndex: 2,
        status: LessonStatus.DRAFT,
      },
    });
    draftLessonId = drfLesson.id;

    // Tạo resources
    const pubRes = await prisma.resource.create({
      data: {
        parentType: ResourceParent.LESSON,
        lessonId: publishedLessonId,
        uploadedBy: teacherUser.id,
        fileName: 'tailieu-chinhthuc.pdf',
        storageKey: 'raw:classroom-hub/lessons/e2e/tailieu-chinhthuc.pdf',
        fileSizeBytes: 2048n,
        mimeType: 'application/pdf',
      },
    });
    publishedResourceId = pubRes.id;

    const drfRes = await prisma.resource.create({
      data: {
        parentType: ResourceParent.LESSON,
        lessonId: draftLessonId,
        uploadedBy: teacherUser.id,
        fileName: 'tailieu-nhap.pdf',
        storageKey: 'raw:classroom-hub/lessons/e2e/tailieu-nhap.pdf',
        fileSizeBytes: 1024n,
        mimeType: 'application/pdf',
      },
    });
    draftResourceId = drfRes.id;
  });

  afterAll(async () => {
    if (courseId) {
      await prisma.resource.deleteMany({
        where: { id: { in: [publishedResourceId, draftResourceId] } },
      });
      await prisma.lesson.deleteMany({
        where: { id: { in: [publishedLessonId, draftLessonId] } },
      });
      await prisma.module.deleteMany({ where: { id: moduleId } });
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    await prisma.user.deleteMany({
      where: {
        id: { in: [teacherUser?.id, studentUser?.id, unenrolledUser?.id] },
      },
    });
    await app.close();
  });

  it('1. Chưa đăng nhập -> 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer()).get(
      `/resources/${publishedResourceId}/preview`,
    );
    expect(res.status).toBe(401);
  });

  it('2. Sinh viên chưa tham gia môn học -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/resources/${publishedResourceId}/preview`)
      .set('Authorization', `Bearer ${unenrolledUser.token}`);

    expect(res.status).toBe(403);
  });

  it('3. Sinh viên xem tài liệu của bài học PUBLISHED -> 200 OK với signed preview URL', async () => {
    const res = await request(app.getHttpServer())
      .get(`/resources/${publishedResourceId}/preview`)
      .set('Authorization', `Bearer ${studentUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('tailieu-chinhthuc.pdf');
    expect(res.body.data.expiresIn).toBe(600);
    expect(res.body.data.url).toContain('authenticated');
    expect(res.body.data.url).not.toContain('fl_attachment');
  });

  it('4. Sinh viên xem tài liệu của bài học DRAFT -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/resources/${draftResourceId}/preview`)
      .set('Authorization', `Bearer ${studentUser.token}`);

    expect(res.status).toBe(403);
  });

  it('5. Giáo viên xem tài liệu của bài học DRAFT -> 200 OK', async () => {
    const res = await request(app.getHttpServer())
      .get(`/resources/${draftResourceId}/preview`)
      .set('Authorization', `Bearer ${teacherUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.fileName).toBe('tailieu-nhap.pdf');
  });

  it('6. Lấy link tải xuống (download) -> có cờ fl_attachment', async () => {
    const res = await request(app.getHttpServer())
      .get(`/resources/${publishedResourceId}/download`)
      .set('Authorization', `Bearer ${studentUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain('fl_attachment');
    expect(res.body.data.expiresIn).toBe(600);
  });

  it('7. Lấy danh sách tài liệu bài học (GET /lessons/:lessonId/resources) -> 200 OK', async () => {
    const res = await request(app.getHttpServer())
      .get(`/lessons/${publishedLessonId}/resources`)
      .set('Authorization', `Bearer ${studentUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].fileName).toBe('tailieu-chinhthuc.pdf');
  });

  it('8. Mã tài liệu không hợp lệ -> 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .get('/resources/invalid-abc/preview')
      .set('Authorization', `Bearer ${studentUser.token}`);

    expect(res.status).toBe(400);
  });

  it('9. Mã tài liệu không tồn tại -> 404 Not Found', async () => {
    const res = await request(app.getHttpServer())
      .get('/resources/99999999/preview')
      .set('Authorization', `Bearer ${teacherUser.token}`);

    expect(res.status).toBe(404);
  });
});

