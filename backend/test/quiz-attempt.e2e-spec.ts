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
  QuestionType,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/enums.js';
import { Prisma } from '../src/generated/prisma/client.js';

/**
 * Luồng làm bài trắc nghiệm: bắt đầu (snapshot, không lộ đáp án) → lưu nháp → nộp + chấm tự động →
 * điểm sổ theo chính sách nhiều lượt → đổi chính sách tính lại điểm → hết lượt; tự nộp khi hết giờ; phân quyền.
 */
describe('Quiz Attempt (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let teacher: { id: bigint; token: string };
  let student: { id: bigint; token: string };
  let student2: { id: bigint; token: string };
  let outsider: { id: bigint; token: string };
  let courseId: bigint;
  let moduleId: bigint;
  const DAY = 24 * 60 * 60 * 1000;

  /** Câu hỏi ngân hàng + đáp án; trả về snapshot như QuizService.addQuestion */
  const makeQuestion = async (content: string, type: QuestionType, choices: [string, boolean][]) => {
    const q = await prisma.questionBank.create({
      data: {
        ownerId: teacher.id,
        content,
        questionType: type,
        defaultScore: new Prisma.Decimal(1),
        choices: { create: choices.map(([c, ok], i) => ({ content: c, isCorrect: ok, orderIndex: i + 1 })) },
      },
      include: { choices: { orderBy: { orderIndex: 'asc' } } },
    });
    return {
      id: q.id,
      snapshot: {
        questionId: q.id.toString(),
        content: q.content,
        questionType: q.questionType,
        choices: q.choices.map((c) => ({ id: c.id.toString(), content: c.content, isCorrect: c.isCorrect, orderIndex: c.orderIndex })),
      },
    };
  };

  const createQuiz = async (data: Partial<Prisma.QuizUncheckedCreateInput> & { scoringEnabled?: boolean }) => {
    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        moduleId,
        createdBy: teacher.id,
        title: 'Quiz E2E',
        openAt: new Date(Date.now() - DAY),
        dueAt: new Date(Date.now() + DAY),
        maxAttempts: 2,
        status: ActivityStatus.PUBLISHED,
        publishedAt: new Date(),
        ...data,
      },
    });
    const q1 = await makeQuestion('Q1 single', QuestionType.SINGLE, [['A', true], ['B', false], ['C', false]]);
    const q2 = await makeQuestion('Q2 multiple', QuestionType.MULTIPLE, [['A', true], ['B', true], ['C', false]]);
    const q3 = await makeQuestion('Q3 single', QuestionType.SINGLE, [['A', false], ['B', true]]);
    let order = 1;
    for (const [q, score] of [[q1, 1], [q2, 2], [q3, 1]] as const) {
      await prisma.quizQuestion.create({
        data: { quizId: quiz.id, questionId: q.id, orderIndex: order++, maxScore: new Prisma.Decimal(score), questionSnapshot: q.snapshot },
      });
    }
    if (data.scoringEnabled !== false) {
      await prisma.gradeItem.create({
        data: { courseId, category: GradeCategory.QUIZ, quizId: quiz.id, maxScore: new Prisma.Decimal(4) },
      });
    }
    return quiz.id.toString();
  };

  const base = (quizId: string) => `/courses/${courseId.toString()}/quizzes/${quizId}`;
  const auth = (t: { token: string }) => ({ Authorization: `Bearer ${t.token}` });

  /** Chọn đáp án theo nội dung ('A'…) cho câu hỏi đã trả về (không có isCorrect) */
  const pick = (question: { id: string; snapshot: { choices: { id: string; content: string }[] } }, ...contents: string[]) => ({
    attemptQuestionId: question.id,
    choiceIds: question.snapshot.choices.filter((c) => contents.includes(c.content)).map((c) => c.id),
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    const passwordHash = await bcrypt.hash('Password123@', 10);
    const now = Date.now();
    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'eduhub_super_secret_jwt_access_key_2026_dev_hcmute';
    const makeUser = async (prefix: string, role: UserRole) => {
      const user = await prisma.user.create({
        data: { email: `e2e_quiz_${prefix}_${now}@eduhub.com`, fullName: `E2E ${prefix}`, passwordHash, role, status: UserStatus.ACTIVE },
      });
      return { id: user.id, token: jwtService.sign({ sub: user.id.toString(), role: user.role, email: user.email }, { secret: jwtSecret }) };
    };
    teacher = await makeUser('teacher', UserRole.TEACHER);
    student = await makeUser('student', UserRole.STUDENT);
    student2 = await makeUser('student2', UserRole.STUDENT);
    outsider = await makeUser('outsider', UserRole.STUDENT);

    const course = await prisma.course.create({
      data: { name: 'Khóa học E2E Quiz', courseCode: `E2Q${now.toString().slice(-5)}`, ownerId: teacher.id, status: CourseStatus.ACTIVE },
    });
    courseId = course.id;
    moduleId = (await prisma.module.create({ data: { courseId, title: 'Chung', orderIndex: 1, isDefault: true } })).id;
    for (const s of [student, student2]) {
      await prisma.enrollment.create({ data: { courseId, studentId: s.id, status: EnrollmentStatus.ACTIVE } });
    }
  });

  afterAll(async () => {
    if (courseId) {
      // attempt_questions → quiz_questions là Restrict → xóa lượt làm trước khi xóa khóa học
      await prisma.quizAttempt.deleteMany({ where: { quiz: { courseId } } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    await prisma.questionBank.deleteMany({ where: { ownerId: teacher.id } });
    await prisma.user.deleteMany({ where: { id: { in: [teacher.id, student.id, student2.id, outsider.id] } } });
    await app.close();
  });

  it('1. Chưa làm: cửa sổ mở, 2 lượt còn lại; sinh viên ngoài khóa 403', async () => {
    const quizId = await createQuiz({});
    const me = await request(app.getHttpServer()).get(`${base(quizId)}/attempts/me`).set(auth(student));
    expect(me.status).toBe(200);
    expect(me.body.data.attempts).toEqual([]);
    expect(me.body.data.window).toMatchObject({ canStart: true, attemptsLeft: 2, inProgressAttemptId: null });
    expect((await request(app.getHttpServer()).get(`${base(quizId)}/attempts/me`).set(auth(outsider))).status).toBe(403);
  });

  it('2. Bắt đầu → câu hỏi không chứa isCorrect; gọi lại trả cùng lượt; lưu nháp + validate đáp án', async () => {
    const quizId = await createQuiz({ durationMinutes: 30 });
    const server = app.getHttpServer();
    const started = await request(server).post(`${base(quizId)}/attempts`).set(auth(student));
    expect(started.status).toBe(201);
    const attempt = started.body.data;
    expect(attempt.status).toBe('IN_PROGRESS');
    expect(attempt.questions).toHaveLength(3);
    expect(JSON.stringify(attempt.questions)).not.toContain('isCorrect');
    expect(new Date(attempt.deadlineAt).getTime() - new Date(attempt.startedAt).getTime()).toBe(30 * 60_000);

    const again = await request(server).post(`${base(quizId)}/attempts`).set(auth(student));
    expect(again.status).toBe(201);
    expect(again.body.data.id).toBe(attempt.id);

    const [q1] = attempt.questions;
    const saved = await request(server)
      .patch(`${base(quizId)}/attempts/${attempt.id}/answers`)
      .set(auth(student))
      .send({ answers: [pick(q1, 'A')] });
    expect(saved.status).toBe(200);
    expect(saved.body.data.saved).toBe(1);

    // Đáp án không thuộc câu hỏi / chọn 2 đáp án cho câu SINGLE → 400
    const foreign = await request(server)
      .patch(`${base(quizId)}/attempts/${attempt.id}/answers`)
      .set(auth(student))
      .send({ answers: [{ attemptQuestionId: q1.id, choiceIds: ['999999'] }] });
    expect(foreign.status).toBe(400);
    const two = await request(server)
      .patch(`${base(quizId)}/attempts/${attempt.id}/answers`)
      .set(auth(student))
      .send({ answers: [pick(q1, 'A', 'B')] });
    expect(two.status).toBe(400);

    // Sinh viên khác không truy cập được lượt này
    expect((await request(server).get(`${base(quizId)}/attempts/${attempt.id}`).set(auth(student2))).status).toBe(403);

    // Tải lại trang → nhận lại đáp án đã lưu nháp
    const resumed = await request(server).get(`${base(quizId)}/attempts/${attempt.id}`).set(auth(student));
    expect(resumed.body.data.mode).toBe('IN_PROGRESS');
    expect(resumed.body.data.attempt.questions[0].selectedChoiceIds).toEqual(pick(q1, 'A').choiceIds);
  });

  it('3. Nộp → chấm tự động (all-or-nothing), điểm sổ theo chính sách; đổi chính sách tính lại; hết lượt', async () => {
    const quizId = await createQuiz({ attemptGrading: 'HIGHEST', showAnswersAfterSubmit: false });
    const server = app.getHttpServer();

    // Lượt 1: đúng Q1 (1đ) + Q2 (2đ), sai Q3 → 3/4
    const a1 = (await request(server).post(`${base(quizId)}/attempts`).set(auth(student))).body.data;
    const [q1, q2, q3] = a1.questions;
    // Nộp bài không nhận đáp án: đáp án kèm theo bị bỏ qua, chỉ chấm những gì đã lưu nháp
    await request(server)
      .patch(`${base(quizId)}/attempts/${a1.id}/answers`)
      .set(auth(student))
      .send({ answers: [pick(q1, 'A'), pick(q2, 'A', 'B'), pick(q3, 'A')] });
    const r1 = await request(server)
      .post(`${base(quizId)}/attempts/${a1.id}/submit`)
      .set(auth(student))
      .send({ answers: [pick(q1, 'B'), pick(q2, 'A'), pick(q3, 'B')] });
    expect(r1.status).toBe(200);
    expect(r1.body.data).toMatchObject({ status: 'GRADED', totalScore: '3.00', totalMaxScore: '4.00', correctCount: 2, answersRevealed: false });
    // Giáo viên không cho xem đáp án → sinh viên chỉ nhận điểm, không nhận chi tiết câu hỏi / lựa chọn
    expect(r1.body.data.questions).toEqual([]);
    expect(JSON.stringify(r1.body.data)).not.toContain('correctChoiceIds');

    // Nộp lại lượt đã nộp → trả kết quả cũ, không lỗi, không tạo thêm
    const dup = await request(server).post(`${base(quizId)}/attempts/${a1.id}/submit`).set(auth(student)).send({});
    expect(dup.status).toBe(200);
    expect(dup.body.data.totalScore).toBe('3.00');

    const gradeItem = await prisma.gradeItem.findUniqueOrThrow({ where: { quizId: BigInt(quizId) } });
    const grade1 = await prisma.grade.findUniqueOrThrow({
      where: { uk_grades_grade_item_student: { gradeItemId: gradeItem.id, studentId: student.id } },
      include: { histories: true },
    });
    expect(grade1.score.toFixed(2)).toBe('3.00');
    expect(grade1.gradingMethod).toBe('AUTO');
    expect(grade1.histories).toHaveLength(1);

    // Lượt 2 thấp hơn: chỉ Q2 đúng (2đ) → HIGHEST giữ 3.00
    const a2 = (await request(server).post(`${base(quizId)}/attempts`).set(auth(student))).body.data;
    expect(a2.attemptNumber).toBe(2);
    const [b1, b2, b3] = a2.questions;
    await request(server)
      .patch(`${base(quizId)}/attempts/${a2.id}/answers`)
      .set(auth(student))
      .send({ answers: [pick(b1, 'B'), pick(b2, 'A', 'B'), pick(b3, 'A')] });
    await request(server).post(`${base(quizId)}/attempts/${a2.id}/submit`).set(auth(student)).send({});
    const grade2 = await prisma.grade.findUniqueOrThrow({ where: { id: grade1.id } });
    expect(grade2.score.toFixed(2)).toBe('3.00');

    // Giáo viên đổi sang "lượt gần nhất" sau khi đã xuất bản → điểm sổ = 2.00, thêm lịch sử
    const patched = await request(server).patch(base(quizId)).set(auth(teacher)).send({ attemptGrading: 'LATEST' });
    expect(patched.status).toBe(200);
    const grade3 = await prisma.grade.findUniqueOrThrow({ where: { id: grade1.id }, include: { histories: true } });
    expect(grade3.score.toFixed(2)).toBe('2.00');
    expect(grade3.histories).toHaveLength(2);

    // Trung bình → 2.50
    await request(server).patch(base(quizId)).set(auth(teacher)).send({ attemptGrading: 'AVERAGE' });
    expect((await prisma.grade.findUniqueOrThrow({ where: { id: grade1.id } })).score.toFixed(2)).toBe('2.50');

    // Hết 2 lượt → 409
    const third = await request(server).post(`${base(quizId)}/attempts`).set(auth(student));
    expect(third.status).toBe(409);
    const me = await request(server).get(`${base(quizId)}/attempts/me`).set(auth(student));
    expect(me.body.data.window).toMatchObject({ canStart: false, reason: 'NO_ATTEMPTS_LEFT', attemptsLeft: 0 });
    expect(me.body.data.gradeScore).toBe('2.50');

    // Giáo viên: bảng lượt làm + xem kết quả luôn thấy đáp án đúng; sinh viên không xem được bảng
    const list = await request(server).get(`${base(quizId)}/attempts`).set(auth(teacher));
    expect(list.status).toBe(200);
    expect(list.body.data.summary).toMatchObject({ enrolled: 2, attempted: 1, notAttempted: 1 });
    const row = list.body.data.rows.find((r: { student: { id: string } }) => r.student.id === student.id.toString());
    expect(row).toMatchObject({ attemptCount: 2, bestScore: '3.00', latestScore: '2.00', gradeScore: '2.50' });
    const review = await request(server).get(`${base(quizId)}/attempts/${a1.id}/result`).set(auth(teacher));
    expect(review.body.data.answersRevealed).toBe(true);
    expect(review.body.data.questions[0].correctChoiceIds).toHaveLength(1);
    expect((await request(server).get(`${base(quizId)}/attempts`).set(auth(student))).status).toBe(403);
    expect((await request(server).patch(base(quizId)).set(auth(student)).send({ attemptGrading: 'HIGHEST' })).status).toBe(403);
  });

  it('4. Hết giờ: lượt dở được tự nộp khi sinh viên quay lại; đáp án đã lưu nháp vẫn được chấm', async () => {
    const quizId = await createQuiz({ durationMinutes: 1, showAnswersAfterSubmit: true });
    const server = app.getHttpServer();
    const a = (await request(server).post(`${base(quizId)}/attempts`).set(auth(student))).body.data;
    await request(server).patch(`${base(quizId)}/attempts/${a.id}/answers`).set(auth(student)).send({ answers: [pick(a.questions[2], 'B')] });
    // Giả lập đã bắt đầu từ 5 phút trước
    await prisma.quizAttempt.update({ where: { id: BigInt(a.id) }, data: { startedAt: new Date(Date.now() - 5 * 60_000) } });

    const late = await request(server).patch(`${base(quizId)}/attempts/${a.id}/answers`).set(auth(student)).send({ answers: [pick(a.questions[0], 'A')] });
    expect(late.status).toBe(409);

    const got = await request(server).get(`${base(quizId)}/attempts/${a.id}`).set(auth(student));
    expect(got.body.data.mode).toBe('RESULT');
    expect(got.body.data.attempt).toMatchObject({ status: 'GRADED', totalScore: '1.00', answersRevealed: true });
    expect(got.body.data.attempt.questions[2].correctChoiceIds).toHaveLength(1);
  });

  it('5. Chặn theo cửa sổ: chưa mở / đã đóng / đề nháp / quá hạn', async () => {
    const server = app.getHttpServer();
    const notOpen = await createQuiz({ openAt: new Date(Date.now() + DAY), dueAt: new Date(Date.now() + 2 * DAY) });
    expect((await request(server).post(`${base(notOpen)}/attempts`).set(auth(student))).status).toBe(409);
    const closed = await createQuiz({ status: ActivityStatus.CLOSED });
    expect((await request(server).post(`${base(closed)}/attempts`).set(auth(student))).status).toBe(409);
    const draft = await createQuiz({ status: ActivityStatus.DRAFT, publishedAt: null });
    expect((await request(server).get(`${base(draft)}/attempts/me`).set(auth(student))).status).toBe(403);
    const past = await createQuiz({ dueAt: new Date(Date.now() - 1000), openAt: new Date(Date.now() - DAY) });
    const me = await request(server).get(`${base(past)}/attempts/me`).set(auth(student));
    expect(me.body.data.window).toMatchObject({ canStart: false, reason: 'PAST_DUE' });
  });

  it('7. Giáo viên đóng đề → lượt đang dở bị chốt ngay với đáp án đã lưu; sinh viên không tiếp tục được', async () => {
    const quizId = await createQuiz({ durationMinutes: 30, showAnswersAfterSubmit: true });
    const server = app.getHttpServer();
    const a = (await request(server).post(`${base(quizId)}/attempts`).set(auth(student2))).body.data;
    await request(server).patch(`${base(quizId)}/attempts/${a.id}/answers`).set(auth(student2)).send({ answers: [pick(a.questions[0], 'A')] });

    const closed = await request(server).post(`${base(quizId)}/close`).set(auth(teacher));
    expect(closed.status).toBe(200);

    const row = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: BigInt(a.id) } });
    expect(row.status).toBe('GRADED');
    expect(row.totalScore?.toFixed(2)).toBe('1.00');

    const got = await request(server).get(`${base(quizId)}/attempts/${a.id}`).set(auth(student2));
    expect(got.body.data.mode).toBe('RESULT');
    const list = await request(server).get(`${base(quizId)}/attempts`).set(auth(teacher));
    expect(list.body.data.summary.inProgress).toBe(0);
  });

  it('8. Gỡ sinh viên khỏi khóa học → lượt đang dở được chốt ngay', async () => {
    const quizId = await createQuiz({ durationMinutes: 30 });
    const server = app.getHttpServer();
    const a = (await request(server).post(`${base(quizId)}/attempts`).set(auth(student2))).body.data;
    await request(server).patch(`${base(quizId)}/attempts/${a.id}/answers`).set(auth(student2)).send({ answers: [pick(a.questions[2], 'B')] });

    const removed = await request(server).delete(`/courses/${courseId.toString()}/members/${student2.id.toString()}`).set(auth(teacher));
    expect(removed.status).toBe(200);

    const row = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: BigInt(a.id) } });
    expect(row.status).toBe('GRADED');
    expect(row.totalScore?.toFixed(2)).toBe('1.00');

    // Khôi phục enrollment cho các test sau
    await prisma.enrollment.update({
      where: { uk_enrollments_course_student: { courseId, studentId: student2.id } },
      data: { status: EnrollmentStatus.ACTIVE, removedAt: null },
    });
  });

  it('6. Đề không chấm điểm: vẫn chấm đúng/sai nhưng không ghi Grade', async () => {
    const quizId = await createQuiz({ scoringEnabled: false });
    const server = app.getHttpServer();
    const a = (await request(server).post(`${base(quizId)}/attempts`).set(auth(student2))).body.data;
    await request(server).patch(`${base(quizId)}/attempts/${a.id}/answers`).set(auth(student2)).send({ answers: [pick(a.questions[0], 'A')] });
    const r = await request(server).post(`${base(quizId)}/attempts/${a.id}/submit`).set(auth(student2)).send({});
    expect(r.body.data).toMatchObject({ status: 'GRADED', totalScore: '1.00' });
    expect(await prisma.gradeItem.findUnique({ where: { quizId: BigInt(quizId) } })).toBeNull();
  });
});
