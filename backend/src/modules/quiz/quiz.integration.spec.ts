import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppModule } from '../../app.module.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import {
  CourseStatus,
  EnrollmentStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';

/**
 * Suite này cần PostgreSQL thật. Khi DB chưa chạy, tự động skip thay vì làm đỏ
 * toàn bộ `npm test`; chạy `npm run db:sync` rồi test lại để kiểm tra đầy đủ.
 */
const canReachDatabase = await (async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return false;

  const probe = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await probe.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.$disconnect().catch(() => undefined);
  }
})();

describe.skipIf(!canReachDatabase)('Quiz Controller & Guards Integration Matrix', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let teacherOwner: { id: bigint; token: string };
  let teacherOther: { id: bigint; token: string };
  let studentMember: { id: bigint; token: string };
  let studentNonMember: { id: bigint; token: string };
  let courseId: bigint;
  let moduleId: bigint;
  let secondModuleId: bigint;
  let draftQuizId: string;
  let ownQuestionId: string;
  let otherQuestionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
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
      'quiz_t_owner',
      'Giáo Viên Sở Hữu Quiz',
      UserRole.TEACHER,
    );
    teacherOther = await createUserWithToken(
      'quiz_t_other',
      'Giáo Viên Khác Quiz',
      UserRole.TEACHER,
    );
    studentMember = await createUserWithToken(
      'quiz_s_member',
      'Sinh Viên Thành Viên Quiz',
      UserRole.STUDENT,
    );
    studentNonMember = await createUserWithToken(
      'quiz_s_outsider',
      'Sinh Viên Ngoài Khóa Quiz',
      UserRole.STUDENT,
    );

    const course = await prisma.course.create({
      data: {
        name: 'Khóa học Kiểm thử Quiz',
        courseCode: `QZ${now.toString().slice(-5)}`,
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
      data: { courseId, title: 'Chương 1', orderIndex: 1 },
    });
    moduleId = testModule.id;
    const secondModule = await prisma.module.create({
      data: { courseId, title: 'Chương 2', orderIndex: 2 },
    });
    secondModuleId = secondModule.id;

    // Ngân hàng câu hỏi của giáo viên sở hữu
    const ownQuestionRes = await request(app.getHttpServer())
      .post('/question-bank')
      .set('Authorization', `Bearer ${teacherOwner.token}`)
      .send({
        content: 'Thủ đô của Việt Nam là gì?',
        questionType: 'SINGLE',
        defaultScore: 2,
        choices: [
          { content: 'Hà Nội', isCorrect: true },
          { content: 'Đà Nẵng', isCorrect: false },
        ],
      });
    expect(ownQuestionRes.status).toBe(201);
    ownQuestionId = ownQuestionRes.body.data.id;

    // Ngân hàng câu hỏi của giáo viên khác (dùng cho test IDOR)
    const otherQuestionRes = await request(app.getHttpServer())
      .post('/question-bank')
      .set('Authorization', `Bearer ${teacherOther.token}`)
      .send({
        content: 'Câu hỏi của giáo viên khác?',
        questionType: 'SINGLE',
        defaultScore: 1,
        choices: [
          { content: 'Đúng', isCorrect: true },
          { content: 'Sai', isCorrect: false },
        ],
      });
    expect(otherQuestionRes.status).toBe(201);
    otherQuestionId = otherQuestionRes.body.data.id;

    const createRes = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/quizzes`)
      .set('Authorization', `Bearer ${teacherOwner.token}`)
      .send({
        moduleId: moduleId.toString(),
        title: 'Đề kiểm tra Nháp Kiểm Thử',
        instructions: 'Làm bài nghiêm túc',
        openAt: '2026-11-01T08:00:00.000Z',
        dueAt: '2026-11-05T23:59:59.000Z',
        durationMinutes: 45,
        maxAttempts: 1,
        scoringEnabled: true,
      });

    expect(createRes.status).toBe(201);
    draftQuizId = createRes.body.data.id;
  });

  afterAll(async () => {
    if (courseId) {
      await prisma.gradeItem.deleteMany({ where: { courseId } });
      await prisma.quizQuestion.deleteMany({ where: { quiz: { courseId } } });
      await prisma.quiz.deleteMany({ where: { courseId } });
      await prisma.module.deleteMany({ where: { courseId } });
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    const questionIds = [ownQuestionId, otherQuestionId]
      .filter(Boolean)
      .map((id) => BigInt(id));
    if (questionIds.length > 0) {
      await prisma.questionBank.deleteMany({ where: { id: { in: questionIds } } });
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

  it('Student gọi POST /courses/:courseId/quizzes -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/quizzes`)
      .set('Authorization', `Bearer ${studentMember.token}`)
      .send({
        moduleId: moduleId.toString(),
        title: 'Đề sinh viên tự tạo',
        openAt: '2026-11-01T08:00:00.000Z',
        dueAt: '2026-11-05T23:59:59.000Z',
      });

    expect(res.status).toBe(403);
  });

  it('Non-member gọi GET /courses/:courseId/quizzes -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/courses/${courseId.toString()}/quizzes`)
      .set('Authorization', `Bearer ${studentNonMember.token}`);

    expect(res.status).toBe(403);
  });

  it('Giáo viên khác gọi PATCH quiz -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/courses/${courseId.toString()}/quizzes/${draftQuizId}`)
      .set('Authorization', `Bearer ${teacherOther.token}`)
      .send({ title: 'Sửa trái phép' });

    expect(res.status).toBe(403);
  });

  it('Student xem quiz DRAFT -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/courses/${courseId.toString()}/quizzes/${draftQuizId}`)
      .set('Authorization', `Bearer ${studentMember.token}`);

    expect(res.status).toBe(403);
  });

  it('Giáo viên A thêm câu hỏi của giáo viên B -> 403 Forbidden (IDOR)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/quizzes/${draftQuizId}/questions`)
      .set('Authorization', `Bearer ${teacherOwner.token}`)
      .send({ questionId: otherQuestionId, maxScore: 2 });

    expect(res.status).toBe(403);
  });

  it('Giáo viên thêm câu hỏi của mình -> 201 Created', async () => {
    const res = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/quizzes/${draftQuizId}/questions`)
      .set('Authorization', `Bearer ${teacherOwner.token}`)
      .send({ questionId: ownQuestionId, maxScore: 2.5 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      questionId: ownQuestionId,
      maxScore: '2.50',
    });
  });

  it('Chuyển quiz DRAFT sang topic khác trong cùng khóa học -> 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/courses/${courseId.toString()}/quizzes/${draftQuizId}`)
      .set('Authorization', `Bearer ${teacherOwner.token}`)
      .send({ moduleId: secondModuleId.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.moduleId).toBe(secondModuleId.toString());
  });

  it('Publish quiz có câu hỏi -> PUBLISHED và chốt điểm 2.50 vào sổ điểm', async () => {
    const res = await request(app.getHttpServer())
      .post(`/courses/${courseId.toString()}/quizzes/${draftQuizId}/publish`)
      .set('Authorization', `Bearer ${teacherOwner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');

    const gradeItem = await prisma.gradeItem.findUnique({
      where: { quizId: BigInt(draftQuizId) },
    });
    expect(gradeItem?.maxScore.toFixed(2)).toBe('2.50');
  });

  it('Student xem quiz PUBLISHED không nhận mảng questions / isCorrect', async () => {
    const res = await request(app.getHttpServer())
      .get(`/courses/${courseId.toString()}/quizzes/${draftQuizId}`)
      .set('Authorization', `Bearer ${studentMember.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.questions).toBeUndefined();
    expect(JSON.stringify(res.body.data)).not.toContain('isCorrect');
  });

  it('Không thể sửa câu hỏi sau khi publish -> 409 Conflict', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/courses/${courseId.toString()}/quizzes/${draftQuizId}`)
      .set('Authorization', `Bearer ${teacherOwner.token}`);

    const questionId = detail.body.data.questions?.[0]?.id;
    expect(questionId).toBeTruthy();

    const res = await request(app.getHttpServer())
      .patch(
        `/courses/${courseId.toString()}/quizzes/${draftQuizId}/questions/${questionId}`,
      )
      .set('Authorization', `Bearer ${teacherOwner.token}`)
      .send({ maxScore: 5 });

    expect(res.status).toBe(409);
  });
});
