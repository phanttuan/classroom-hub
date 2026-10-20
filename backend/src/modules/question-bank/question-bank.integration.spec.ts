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
  QuestionStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';

/**
 * Kiểm thử tích hợp ngân hàng câu hỏi + bộ câu hỏi trên PostgreSQL thật.
 * Tự skip khi không kết nối được DB để `npm test` vẫn chạy được ở máy chưa bật Postgres.
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

describe.skipIf(!canReachDatabase)(
  'Question Bank & Question Sets Integration',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwtService: JwtService;

    let teacherOwner: { id: bigint; token: string };
    let teacherOther: { id: bigint; token: string };
    let courseId: bigint;
    let moduleId: bigint;
    let quizId: bigint;
    let setAId: string;
    let setBId: string;
    let setCId: string;
    let questionId: string;
    let questionKey: string;

    const unique = Date.now();
    const auth = (token: string) => ({
      Authorization: `Bearer ${token}`,
    });

    const createUserWithToken = async (
      prefix: string,
      fullName: string,
    ): Promise<{ id: bigint; token: string }> => {
      const user = await prisma.user.create({
        data: {
          email: `${prefix}_${unique}@eduhub.com`,
          fullName,
          passwordHash: await bcrypt.hash('Password123@', 10),
          role: UserRole.TEACHER,
          status: UserStatus.ACTIVE,
        },
      });
      const token = jwtService.sign(
        { sub: user.id.toString(), role: user.role, email: user.email },
        {
          secret:
            process.env.JWT_SECRET ||
            process.env.JWT_ACCESS_SECRET ||
            'eduhub_super_secret_jwt_access_key_2026_dev_hcmute',
        },
      );
      return { id: user.id, token };
    };

    const createSet = async (token: string, name: string) => {
      const res = await request(app.getHttpServer())
        .post('/question-bank/sets')
        .set(auth(token))
        .send({ name });
      expect(res.status).toBe(201);
      return res.body.data.id as string;
    };

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

      teacherOwner = await createUserWithToken(
        'qb_t_owner',
        'Giáo Viên Ngân Hàng',
      );
      teacherOther = await createUserWithToken(
        'qb_t_other',
        'Giáo Viên Khác Ngân Hàng',
      );

      setAId = await createSet(teacherOwner.token, 'Bộ A');
      setBId = await createSet(teacherOwner.token, 'Bộ B');

      const createQuestionRes = await request(app.getHttpServer())
        .post('/question-bank')
        .set(auth(teacherOwner.token))
        .send({
          content: 'Thủ đô của Việt Nam là gì?',
          questionType: 'SINGLE',
          defaultScore: 2,
          setId: setAId,
          choices: [
            { content: 'Hà Nội', isCorrect: true },
            { content: 'Đà Nẵng', isCorrect: false },
          ],
        });
      expect(createQuestionRes.status).toBe(201);
      questionId = createQuestionRes.body.data.id;
      questionKey = createQuestionRes.body.data.questionKey;

      // Tạo quiz và thêm câu hỏi để kiểm tra hành vi version khi câu hỏi đã được dùng.
      const course = await prisma.course.create({
        data: {
          name: 'Khóa học Ngân Hàng Câu Hỏi',
          courseCode: `QB${unique.toString().slice(-5)}`,
          ownerId: teacherOwner.id,
          status: CourseStatus.ACTIVE,
        },
      });
      courseId = course.id;
      const testModule = await prisma.module.create({
        data: { courseId, title: 'Chương 1', orderIndex: 1 },
      });
      moduleId = testModule.id;

      const createQuizRes = await request(app.getHttpServer())
        .post(`/courses/${courseId.toString()}/quizzes`)
        .set(auth(teacherOwner.token))
        .send({
          moduleId: moduleId.toString(),
          title: 'Quiz dùng câu hỏi ngân hàng',
          openAt: '2026-11-01T08:00:00.000Z',
          dueAt: '2026-11-05T23:59:59.000Z',
          scoringEnabled: true,
        });
      expect(createQuizRes.status).toBe(201);
      quizId = BigInt(createQuizRes.body.data.id);

      const addQuestionRes = await request(app.getHttpServer())
        .post(
          `/courses/${courseId.toString()}/quizzes/${quizId.toString()}/questions`,
        )
        .set(auth(teacherOwner.token))
        .send({ questionId });
      expect(addQuestionRes.status).toBe(201);
    });

    afterAll(async () => {
      if (courseId) {
        await prisma.gradeItem.deleteMany({ where: { courseId } });
        await prisma.quizQuestion.deleteMany({ where: { quiz: { courseId } } });
        await prisma.quiz.deleteMany({ where: { courseId } });
        await prisma.module.deleteMany({ where: { courseId } });
        await prisma.course.deleteMany({ where: { id: courseId } });
      }
      if (teacherOwner || teacherOther) {
        const ownerIds = [teacherOwner?.id, teacherOther?.id].filter(
          (id): id is bigint => Boolean(id),
        );
        await prisma.questionBank.deleteMany({
          where: { ownerId: { in: ownerIds } },
        });
        await prisma.questionSet.deleteMany({
          where: { ownerId: { in: ownerIds } },
        });
        await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
      }
      await app.close();
    });

    it('liệt kê bộ câu hỏi kèm số câu ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .get('/question-bank/sets')
        .set(auth(teacherOwner.token));

      expect(res.status).toBe(200);
      const setA = res.body.data.find(
        (set: { id: string }) => set.id === setAId,
      );
      const setB = res.body.data.find(
        (set: { id: string }) => set.id === setBId,
      );
      expect(setA.questionCount).toBe(1);
      expect(setB.questionCount).toBe(0);
    });

    it('lọc câu hỏi theo bộ và theo chưa phân bộ', async () => {
      const inSetRes = await request(app.getHttpServer())
        .get(`/question-bank?setId=${setAId}`)
        .set(auth(teacherOwner.token));
      expect(inSetRes.status).toBe(200);
      expect(inSetRes.body.data).toHaveLength(1);
      expect(inSetRes.body.data[0]).toMatchObject({
        id: questionId,
        setId: setAId,
        setName: 'Bộ A',
        usageCount: 1,
      });

      const unfiledRes = await request(app.getHttpServer())
        .get('/question-bank?unfiled=true')
        .set(auth(teacherOwner.token));
      expect(unfiledRes.status).toBe(200);
      expect(unfiledRes.body.data).toHaveLength(0);
    });

    it('chuyển câu hỏi sang bộ khác không tạo phiên bản mới', async () => {
      // Giống form sửa: luôn gửi đủ nội dung/đáp án dù chỉ đổi bộ câu hỏi.
      const res = await request(app.getHttpServer())
        .patch(`/question-bank/${questionId}`)
        .set(auth(teacherOwner.token))
        .send({
          content: 'Thủ đô của Việt Nam là gì?',
          questionType: 'SINGLE',
          defaultScore: 2,
          setId: setBId,
          choices: [
            { content: 'Hà Nội', isCorrect: true },
            { content: 'Đà Nẵng', isCorrect: false },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: questionId,
        setId: setBId,
        version: 1,
      });
    });

    it('xóa bộ câu hỏi đưa câu hỏi về chưa phân bộ', async () => {
      const deleteRes = await request(app.getHttpServer())
        .delete(`/question-bank/sets/${setBId}`)
        .set(auth(teacherOwner.token));
      expect(deleteRes.status).toBe(200);

      const detailRes = await request(app.getHttpServer())
        .get(`/question-bank/${questionId}`)
        .set(auth(teacherOwner.token));
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.setId).toBeNull();

      const unfiledRes = await request(app.getHttpServer())
        .get('/question-bank?unfiled=true')
        .set(auth(teacherOwner.token));
      expect(unfiledRes.status).toBe(200);
      expect(unfiledRes.body.data.map((q: { id: string }) => q.id)).toContain(
        questionId,
      );
    });

    it('sửa câu hỏi đã dùng tạo version mới, bản cũ RETIRED', async () => {
      setCId = await createSet(teacherOwner.token, 'Bộ C');
      await prisma.questionBank.update({
        where: { id: BigInt(questionId) },
        data: { setId: BigInt(setCId) },
      });

      const res = await request(app.getHttpServer())
        .patch(`/question-bank/${questionId}`)
        .set(auth(teacherOwner.token))
        .send({
          content: 'Thủ đô của Việt Nam là thành phố nào?',
          choices: [
            { content: 'Hà Nội', isCorrect: true },
            { content: 'Đà Nẵng', isCorrect: false },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        questionKey,
        version: 2,
        status: QuestionStatus.ACTIVE,
        setId: setCId,
      });
      expect(res.body.data.id).not.toBe(questionId);

      const oldVersion = await prisma.questionBank.findUnique({
        where: { id: BigInt(questionId) },
      });
      expect(oldVersion?.status).toBe(QuestionStatus.RETIRED);

      const listRes = await request(app.getHttpServer())
        .get(`/question-bank?setId=${setCId}`)
        .set(auth(teacherOwner.token));
      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].version).toBe(2);

      questionId = res.body.data.id;
    });

    it('sửa câu hỏi đã dùng kèm đổi bộ tạo version mới mang setId mới', async () => {
      // Gắn câu hỏi hiện tại vào quiz để mô phỏng đã được sử dụng
      const addRes = await request(app.getHttpServer())
        .post(
          `/courses/${courseId.toString()}/quizzes/${quizId.toString()}/questions`,
        )
        .set(auth(teacherOwner.token))
        .send({ questionId });
      expect(addRes.status).toBe(201);

      const res = await request(app.getHttpServer())
        .patch(`/question-bank/${questionId}`)
        .set(auth(teacherOwner.token))
        .send({
          content: 'Thủ đô của Việt Nam là gì (câu hỏi cập nhật lần 3)?',
          setId: setAId,
          choices: [
            { content: 'Hà Nội', isCorrect: true },
            { content: 'TP. Hồ Chí Minh', isCorrect: false },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        questionKey,
        version: 3,
        status: QuestionStatus.ACTIVE,
        setId: setAId,
      });

      const v2 = await prisma.questionBank.findUnique({
        where: { id: BigInt(questionId) },
      });
      expect(v2?.status).toBe(QuestionStatus.RETIRED);

      const listRes = await request(app.getHttpServer())
        .get(`/question-bank?setId=${setAId}`)
        .set(auth(teacherOwner.token));
      expect(listRes.status).toBe(200);
      expect(
        listRes.body.data.some(
          (q: { id: string; version: number }) => q.version === 3,
        ),
      ).toBe(true);

      questionId = res.body.data.id;
    });

    it('chặn IDOR giữa các giáo viên', async () => {
      const getRes = await request(app.getHttpServer())
        .get(`/question-bank/${questionId}`)
        .set(auth(teacherOther.token));
      expect(getRes.status).toBe(404);

      const patchRes = await request(app.getHttpServer())
        .patch(`/question-bank/${questionId}`)
        .set(auth(teacherOther.token))
        .send({ content: 'Chiếm câu hỏi' });
      expect(patchRes.status).toBe(404);

      const deleteRes = await request(app.getHttpServer())
        .delete(`/question-bank/${questionId}`)
        .set(auth(teacherOther.token));
      expect(deleteRes.status).toBe(404);

      const renameSetRes = await request(app.getHttpServer())
        .patch(`/question-bank/sets/${setCId}`)
        .set(auth(teacherOther.token))
        .send({ name: 'Chiếm bộ' });
      expect(renameSetRes.status).toBe(404);

      const createWithOtherSetRes = await request(app.getHttpServer())
        .post('/question-bank')
        .set(auth(teacherOther.token))
        .send({
          content: 'Câu hỏi gán vào bộ người khác?',
          questionType: 'SINGLE',
          setId: setCId,
          choices: [
            { content: 'A', isCorrect: true },
            { content: 'B', isCorrect: false },
          ],
        });
      expect(createWithOtherSetRes.status).toBe(400);
    });

    it('xóa mềm câu hỏi và ẩn khỏi danh sách ACTIVE', async () => {
      const deleteRes = await request(app.getHttpServer())
        .delete(`/question-bank/${questionId}`)
        .set(auth(teacherOwner.token));
      expect(deleteRes.status).toBe(200);

      const listRes = await request(app.getHttpServer())
        .get('/question-bank')
        .set(auth(teacherOwner.token));
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.map((q: { id: string }) => q.id)).not.toContain(
        questionId,
      );
    });
  },
);
