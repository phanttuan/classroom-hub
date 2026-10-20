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
  SubmissionStatus,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/enums.js';
import { Prisma } from '../src/generated/prisma/client.js';

/**
 * Luồng nộp bài của sinh viên (bài làm văn bản — không gọi Cloudinary):
 * nộp → xem → sửa (cập nhật thời gian nộp) → loại bỏ; nộp trễ; chặn theo tùy chọn giáo viên; phân quyền.
 */
describe('Student Submission (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let teacher: { id: bigint; token: string };
  let student: { id: bigint; token: string };
  let outsider: { id: bigint; token: string };
  let courseId: bigint;
  let moduleId: bigint;
  const assignmentIds: bigint[] = [];

  const DAY = 24 * 60 * 60 * 1000;

  const createAssignment = async (data: Partial<Prisma.AssignmentUncheckedCreateInput>) => {
    const a = await prisma.assignment.create({
      data: {
        courseId,
        moduleId,
        createdBy: teacher.id,
        title: 'Bài tập E2E',
        maxScore: new Prisma.Decimal(10),
        openAt: new Date(Date.now() - DAY),
        dueAt: new Date(Date.now() + DAY),
        status: ActivityStatus.PUBLISHED,
        publishedAt: new Date(),
        ...data,
      },
    });
    await prisma.gradeItem.create({
      data: { courseId, category: GradeCategory.ASSIGNMENT, assignmentId: a.id, maxScore: a.maxScore },
    });
    assignmentIds.push(a.id);
    return a.id.toString();
  };

  const submissionUrl = (assignmentId: string) =>
    `/courses/${courseId.toString()}/assignments/${assignmentId}/submission`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
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

    const makeUser = async (prefix: string, role: UserRole) => {
      const user = await prisma.user.create({
        data: {
          email: `e2e_sub_${prefix}_${now}@eduhub.com`,
          fullName: `E2E ${prefix}`,
          passwordHash,
          role,
          status: UserStatus.ACTIVE,
        },
      });
      return {
        id: user.id,
        token: jwtService.sign(
          { sub: user.id.toString(), role: user.role, email: user.email },
          { secret: jwtSecret },
        ),
      };
    };

    teacher = await makeUser('teacher', UserRole.TEACHER);
    student = await makeUser('student', UserRole.STUDENT);
    outsider = await makeUser('outsider', UserRole.STUDENT);

    const course = await prisma.course.create({
      data: {
        name: 'Khóa học E2E Submission',
        courseCode: `E2S${now.toString().slice(-5)}`,
        ownerId: teacher.id,
        status: CourseStatus.ACTIVE,
      },
    });
    courseId = course.id;
    moduleId = (await prisma.module.create({ data: { courseId, title: 'Chung', orderIndex: 1, isDefault: true } })).id;
    await prisma.enrollment.create({
      data: { courseId, studentId: student.id, status: EnrollmentStatus.ACTIVE },
    });
  });

  afterAll(async () => {
    if (courseId) {
      // Xóa course → cascade assignment / gradeItem / submission / resource / module / enrollment
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [teacher.id, student.id, outsider.id].filter(Boolean) } },
    });
    await app.close();
  });

  it('1. Chưa nộp: GET submission trả về null kèm cửa sổ nộp mở và quy tắc tệp', async () => {
    const assignmentId = await createAssignment({});
    const res = await request(app.getHttpServer())
      .get(submissionUrl(assignmentId))
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.submission).toBeNull();
    expect(res.body.data.window).toMatchObject({ canSubmit: true, wouldBeLate: false, reason: null });
    expect(res.body.data.rules.maxFileBytes).toBeGreaterThan(0);
    expect(res.body.data.rules.blockedExtensions).toContain('.exe');
  });

  it('2. Nộp → sửa (thời gian nộp cập nhật, không tạo bản ghi trùng) → loại bỏ', async () => {
    const assignmentId = await createAssignment({});
    const server = app.getHttpServer();

    const first = await request(server)
      .put(submissionUrl(assignmentId))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Bài làm lần 1 <script>alert(1)</script></p>');
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({
      status: SubmissionStatus.SUBMITTED,
      isLate: false,
      content: '<p>Bài làm lần 1 </p>',
      file: null,
    });
    const firstTime = new Date(first.body.data.submittedAt).getTime();

    await new Promise((r) => setTimeout(r, 20));
    const second = await request(server)
      .put(submissionUrl(assignmentId))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Bài làm lần 2</p>');
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(second.body.data.content).toBe('<p>Bài làm lần 2</p>');
    expect(new Date(second.body.data.submittedAt).getTime()).toBeGreaterThan(firstTime);

    const count = await prisma.submission.count({ where: { assignmentId: BigInt(assignmentId) } });
    expect(count).toBe(1);

    // Danh sách bài tập của sinh viên gắn tóm tắt bài nộp
    const list = await request(server)
      .get(`/courses/${courseId.toString()}/assignments`)
      .set('Authorization', `Bearer ${student.token}`);
    const item = list.body.data.find((a: { id: string }) => a.id === assignmentId);
    expect(item.mySubmission).toMatchObject({ id: first.body.data.id, status: 'SUBMITTED', isLate: false });

    const removed = await request(server)
      .delete(submissionUrl(assignmentId))
      .set('Authorization', `Bearer ${student.token}`);
    expect(removed.status).toBe(200);
    expect(await prisma.submission.count({ where: { assignmentId: BigInt(assignmentId) } })).toBe(0);
  });

  it('3. Quá hạn: không cho nộp trễ → 409; cho nộp trễ → nộp được và isLate = true', async () => {
    const server = app.getHttpServer();
    const strict = await createAssignment({ dueAt: new Date(Date.now() - DAY) });
    const blocked = await request(server)
      .put(submissionUrl(strict))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Trễ</p>');
    expect(blocked.status).toBe(409);

    const lenient = await createAssignment({ dueAt: new Date(Date.now() - DAY), allowLateSubmission: true });
    const state = await request(server)
      .get(submissionUrl(lenient))
      .set('Authorization', `Bearer ${student.token}`);
    expect(state.body.data.window).toMatchObject({ isPastDue: true, canSubmit: true, wouldBeLate: true });

    const late = await request(server)
      .put(submissionUrl(lenient))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Trễ</p>');
    expect(late.status).toBe(200);
    expect(late.body.data.isLate).toBe(true);

    // Giáo viên thấy đánh dấu nộp trễ trong danh sách bài nộp
    const teacherList = await request(server)
      .get(`/courses/${courseId.toString()}/assignments/${lenient}/submissions`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(teacherList.status).toBe(200);
    expect(teacherList.body.data.summary).toMatchObject({ enrolled: 1, submitted: 1, late: 1, notSubmitted: 0 });
    expect(teacherList.body.data.rows[0].submission.isLate).toBe(true);
  });

  it('4. Tùy chọn giáo viên được chặn ở backend: tắt bài làm văn bản / tắt tệp / chưa mở / đã đóng', async () => {
    const server = app.getHttpServer();

    const fileOnly = await createAssignment({ allowTextSubmission: false });
    const textRejected = await request(server)
      .put(submissionUrl(fileOnly))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Văn bản</p>');
    expect(textRejected.status).toBe(400);

    const textOnly = await createAssignment({ allowFileSubmission: false });
    const fileRejected = await request(server)
      .put(submissionUrl(textOnly))
      .set('Authorization', `Bearer ${student.token}`)
      .attach('file', Buffer.from('hello'), 'bai-lam.txt');
    expect(fileRejected.status).toBe(400);

    const notOpen = await createAssignment({ openAt: new Date(Date.now() + DAY), dueAt: new Date(Date.now() + 2 * DAY) });
    const tooEarly = await request(server)
      .put(submissionUrl(notOpen))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Sớm</p>');
    expect(tooEarly.status).toBe(409);

    const closed = await createAssignment({ status: ActivityStatus.CLOSED });
    const afterClose = await request(server)
      .put(submissionUrl(closed))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Đóng</p>');
    expect(afterClose.status).toBe(409);

    // Tệp thực thi đổi tên thành .pdf → chặn theo magic bytes (không phụ thuộc đuôi tệp)
    const exeHeader = Buffer.concat([Buffer.from('MZ\x90\x00'), Buffer.alloc(60)]);
    const fakePdf = await request(server)
      .put(submissionUrl(await createAssignment({})))
      .set('Authorization', `Bearer ${student.token}`)
      .attach('file', exeHeader, 'bai-lam.pdf');
    expect(fakePdf.status).toBe(400);
    expect(fakePdf.body.message).toMatch(/thực thi/);

    const empty = await request(server)
      .put(submissionUrl(await createAssignment({})))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>  </p>');
    expect(empty.status).toBe(400);
  });

  it('5. Phân quyền: sinh viên ngoài khóa 403, giáo viên không nộp được, giáo viên xem được danh sách', async () => {
    const server = app.getHttpServer();
    const assignmentId = await createAssignment({});

    const outsiderRes = await request(server)
      .get(submissionUrl(assignmentId))
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(outsiderRes.status).toBe(403);

    const teacherSubmit = await request(server)
      .put(submissionUrl(assignmentId))
      .set('Authorization', `Bearer ${teacher.token}`)
      .field('content', '<p>GV</p>');
    expect(teacherSubmit.status).toBe(403);

    const studentList = await request(server)
      .get(`/courses/${courseId.toString()}/assignments/${assignmentId}/submissions`)
      .set('Authorization', `Bearer ${student.token}`);
    expect(studentList.status).toBe(403);

    const teacherList = await request(server)
      .get(`/courses/${courseId.toString()}/assignments/${assignmentId}/submissions`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(teacherList.status).toBe(200);
    expect(teacherList.body.data.rows).toHaveLength(1);
    expect(teacherList.body.data.rows[0].submission).toBeNull();
  });

  it('7. Giáo viên chấm điểm + nhận xét → sinh viên thấy điểm, không sửa được; bỏ chấm → sửa lại được', async () => {
    const server = app.getHttpServer();
    const assignmentId = await createAssignment({});
    const submitted = await request(server)
      .put(submissionUrl(assignmentId))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Bài làm</p>');
    const submissionId = submitted.body.data.id as string;
    const gradeUrl = `/courses/${courseId.toString()}/assignments/${assignmentId}/submissions/${submissionId}/grade`;

    // Điểm vượt thang → 400; sinh viên không được chấm → 403
    expect((await request(server).put(gradeUrl).set('Authorization', `Bearer ${teacher.token}`).send({ score: 11 })).status).toBe(400);
    expect((await request(server).put(gradeUrl).set('Authorization', `Bearer ${student.token}`).send({ score: 5 })).status).toBe(403);

    const graded = await request(server)
      .put(gradeUrl)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ score: 8.5, feedback: '<p>Khá tốt <script>alert(1)</script></p>' });
    expect(graded.status).toBe(200);
    expect(graded.body.data).toMatchObject({ status: SubmissionStatus.GRADED, score: '8.50', feedback: '<p>Khá tốt </p>' });

    // Chấm lại (idempotent: vẫn 1 Grade, thêm 1 dòng lịch sử)
    const regraded = await request(server).put(gradeUrl).set('Authorization', `Bearer ${teacher.token}`).send({ score: 9 });
    expect(regraded.body.data.score).toBe('9.00');
    const gradeItem = await prisma.gradeItem.findUniqueOrThrow({ where: { assignmentId: BigInt(assignmentId) } });
    const grades = await prisma.grade.findMany({ where: { gradeItemId: gradeItem.id }, include: { histories: true } });
    expect(grades).toHaveLength(1);
    expect(grades[0].histories).toHaveLength(2);
    expect(grades[0].gradedBy).toBe(teacher.id);

    // Sinh viên thấy điểm + nhận xét và bị chặn sửa (409)
    const mine = await request(server).get(submissionUrl(assignmentId)).set('Authorization', `Bearer ${student.token}`);
    expect(mine.body.data.submission).toMatchObject({ score: '9.00', feedback: '<p>Khá tốt </p>' });
    expect(mine.body.data.window).toMatchObject({ canSubmit: false, reason: 'GRADED' });
    const edit = await request(server).put(submissionUrl(assignmentId)).set('Authorization', `Bearer ${student.token}`).field('content', '<p>Sửa</p>');
    expect(edit.status).toBe(409);

    // Bỏ chấm → sinh viên sửa lại được
    const ungraded = await request(server).delete(gradeUrl).set('Authorization', `Bearer ${teacher.token}`);
    expect(ungraded.status).toBe(200);
    expect(ungraded.body.data).toMatchObject({ status: SubmissionStatus.SUBMITTED, score: null });
    const editAgain = await request(server).put(submissionUrl(assignmentId)).set('Authorization', `Bearer ${student.token}`).field('content', '<p>Sửa</p>');
    expect(editAgain.status).toBe(200);
  });

  it('8. Tải toàn bộ tệp bài nộp: trả về .zip (tệp không có trên Cloudinary được ghi vào README)', async () => {
    const server = app.getHttpServer();
    const assignmentId = await createAssignment({});
    const submitted = await request(server)
      .put(submissionUrl(assignmentId))
      .set('Authorization', `Bearer ${student.token}`)
      .field('content', '<p>Bài làm</p>');
    await prisma.resource.create({
      data: {
        parentType: 'SUBMISSION',
        submissionId: BigInt(submitted.body.data.id),
        uploadedBy: student.id,
        fileName: 'bai-lam.pdf',
        storageKey: 'raw:classroom-hub/e2e/khong-ton-tai.pdf',
        fileSizeBytes: 10n,
        mimeType: 'application/pdf',
      },
    });

    const forbidden = await request(server)
      .get(`/courses/${courseId.toString()}/assignments/${assignmentId}/submissions/download`)
      .set('Authorization', `Bearer ${student.token}`);
    expect(forbidden.status).toBe(403);

    const res = await request(server)
      .get(`/courses/${courseId.toString()}/assignments/${assignmentId}/submissions/download`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['x-submission-files']).toBe('1');
    const zip = res.body as Buffer;
    expect(zip.subarray(0, 2).toString()).toBe('PK');
    expect(zip.toString('latin1')).toContain('README.txt');
  }, 30_000);

  it('6. Bài tập nháp: sinh viên không xem / nộp được (403)', async () => {
    const draft = await createAssignment({ status: ActivityStatus.DRAFT, publishedAt: null });
    const res = await request(app.getHttpServer())
      .get(submissionUrl(draft))
      .set('Authorization', `Bearer ${student.token}`);
    expect(res.status).toBe(403);
  });
});
