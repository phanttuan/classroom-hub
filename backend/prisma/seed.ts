import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.js';
import {
  UserRole,
  UserStatus,
  CourseStatus,
  EnrollmentStatus,
  LessonStatus,
  LessonType,
  ResourceParent,
} from '../src/generated/prisma/enums.js';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import { DEFAULT_MODULE_TITLE } from '../src/modules/learning-content/learning-content.constants.js';
import { buildLessonFields } from '../src/modules/learning-content/utils/lesson-fields.js';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/classroom_hub?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ==============================================================================
// TRẠNG THÁI SEED — hash nội dung file này, lưu theo từng DATABASE_URL tại
// node_modules/.cache (mỗi máy tự quản lý). Sửa seed.ts → máy khác pull về sẽ tự seed lại.
// ==============================================================================
const SEED_FILE = fileURLToPath(import.meta.url);
const SEED_HASH = createHash('sha256').update(readFileSync(SEED_FILE, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const SEED_STATE_PATH = join(dirname(SEED_FILE), '..', 'node_modules', '.cache', 'classroom-hub-seed.json');
const DB_KEY = createHash('sha256').update(connectionString).digest('hex').slice(0, 16);

function loadSeedStates(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(SEED_STATE_PATH, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

function readSeedState(): string | undefined {
  return loadSeedStates()[DB_KEY];
}

function writeSeedState() {
  mkdirSync(dirname(SEED_STATE_PATH), { recursive: true });
  writeFileSync(SEED_STATE_PATH, JSON.stringify({ ...loadSeedStates(), [DB_KEY]: SEED_HASH }, null, 2));
}

// ==============================================================================
// DỮ LIỆU MẪU — mô hình Course (Môn học) → Module → Lesson
//
// Mật khẩu chung cho mọi tài khoản: Password123@
// Mã môn học chỉ dùng ký tự hợp lệ của COURSE_CODE_ALPHABET
// (23456789ABCDEFGHJKLMNPQRSTUVWXYZ — không có 0, 1, I, O) để test được chức năng tham gia bằng mã.
// Seed có tính idempotent: các môn học seed bị xóa và tạo lại mỗi lần chạy.
// ==============================================================================

const PASSWORD = 'Password123@';

type UserKey = 'admin' | 'teacher' | 'teacher2' | 'student1' | 'student2' | 'student3' | 'student4' | 'student5';

const USERS: Record<UserKey, { email: string; fullName: string; role: UserRole; status?: UserStatus; avatarUrl: string }> = {
  admin: { email: 'admin@classroomhub.edu.vn', fullName: 'Quản trị hệ thống', role: UserRole.ADMIN, avatarUrl: '/images/teacher.webp' },
  teacher: { email: 'teacher@classroomhub.edu.vn', fullName: 'ThS. Nguyễn Văn A', role: UserRole.TEACHER, avatarUrl: '/images/teacher.webp' },
  teacher2: { email: 'teacher2@classroomhub.edu.vn', fullName: 'TS. Phạm Minh Khoa', role: UserRole.TEACHER, avatarUrl: '/images/teacher.webp' },
  student1: { email: 'student1@classroomhub.edu.vn', fullName: 'Trần Thị Mai', role: UserRole.STUDENT, avatarUrl: '/images/student.webp' },
  student2: { email: 'student2@classroomhub.edu.vn', fullName: 'Lê Hoàng Nam', role: UserRole.STUDENT, avatarUrl: '/images/student.webp' },
  student3: { email: 'student3@classroomhub.edu.vn', fullName: 'Võ Thanh Hà', role: UserRole.STUDENT, avatarUrl: '/images/student.webp' },
  student4: { email: 'student4@classroomhub.edu.vn', fullName: 'Đặng Quốc Bảo', role: UserRole.STUDENT, avatarUrl: '/images/student.webp' },
  student5: { email: 'student5@classroomhub.edu.vn', fullName: 'Ngô Gia Huy', role: UserRole.STUDENT, status: UserStatus.LOCKED, avatarUrl: '/images/student.webp' },
};

interface SeedResource {
  fileName: string;
  mimeType: string;
  sizeKb: number;
}

interface SeedLesson {
  title: string;
  /** Mặc định: có tệp → FILE (1 tệp) / FOLDER (nhiều tệp); có externalUrl → URL; còn lại PAGE */
  type?: LessonType;
  /** HTML (hoặc văn bản thuần — tự bọc thành đoạn văn) */
  content?: string;
  description?: string;
  externalUrl?: string;
  settings?: Record<string, unknown>;
  status?: LessonStatus; // mặc định PUBLISHED
  resources?: SeedResource[];
}

const toHtml = (text?: string) => (!text ? '' : /^\s*</.test(text) ? text : `<p>${text}</p>`);

function resolveLessonType(l: SeedLesson): LessonType {
  if (l.type) return l.type;
  if (l.resources?.length) return l.resources.length > 1 ? LessonType.FOLDER : LessonType.FILE;
  if (l.externalUrl) return LessonType.URL;
  return LessonType.PAGE;
}

interface SeedModule {
  title: string;
  lessons: SeedLesson[];
}

interface SeedCourse {
  code: string;
  name: string;
  description: string;
  owner: UserKey;
  status: CourseStatus;
  enrollments: { student: UserKey; status?: EnrollmentStatus }[];
  // Số bài học PUBLISHED đầu tiên (theo thứ tự hiển thị) mà sinh viên đã hoàn thành; 'all' = toàn bộ
  progress?: Partial<Record<UserKey, number | 'all'>>;
  modules: SeedModule[];
}

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const COURSES: SeedCourse[] = [
  // ---------------------------------------------------------------------------
  // 1. Môn chính để test đầy đủ: nhiều module, đủ loại bài học, đủ trạng thái
  // ---------------------------------------------------------------------------
  {
    code: 'WEBNC26A',
    name: 'Lập trình Web nâng cao',
    description: 'HK1 2026-2027 — Xây dựng ứng dụng Web Fullstack với NestJS, Prisma và Next.js.',
    owner: 'teacher',
    status: CourseStatus.ACTIVE,
    enrollments: [
      { student: 'student1' },
      { student: 'student2' },
      { student: 'student3', status: EnrollmentStatus.REMOVED },
      { student: 'student5' },
    ],
    progress: { student1: 4, student2: 'all', student3: 2 },
    modules: [
      {
        title: 'Chung',
        lessons: [
          {
            title: '',
            type: LessonType.LABEL,
            content:
              '<h3>📢 Chào mừng các bạn đến với môn Lập trình Web nâng cao!</h3>' +
              '<p>Lịch học: <strong>Thứ 3, tiết 1–4</strong>, phòng <strong>A3-201</strong>. ' +
              'Sinh viên vắng quá <mark data-color="#fef08a" style="background-color: #fef08a">20% số buổi</mark> sẽ không được dự thi cuối kỳ.</p>',
          },
          {
            title: 'Nhóm Zalo trao đổi môn học',
            externalUrl: 'https://zalo.me/g/webnc26a',
            description: 'Tham gia nhóm để nhận thông báo nhanh từ giảng viên.',
            settings: { showDescription: true, display: 'NEW_WINDOW' },
          },
          {
            title: 'Đề cương chi tiết môn học',
            description: 'Đề cương gồm mục tiêu, chuẩn đầu ra, kế hoạch giảng dạy 15 tuần và cách đánh giá.',
            resources: [{ fileName: 'de-cuong-web-nang-cao.pdf', mimeType: PDF, sizeKb: 420 }],
          },
        ],
      },
      {
        title: 'Chương 1: Tổng quan & chuẩn bị môi trường',
        lessons: [
          {
            title: 'Kiến trúc ứng dụng Web hiện đại',
            description: 'Mô hình Client–Server, REST API, SPA và SSR.',
            content:
              '<h2>1. Mô hình Client – Server</h2>' +
              '<p>Ứng dụng web hiện đại tách biệt <strong>giao diện (client)</strong> và <strong>xử lý nghiệp vụ (server)</strong>, giao tiếp qua <em>HTTP/HTTPS</em>.</p>' +
              '<blockquote><p>“Separation of concerns” giúp mỗi phần phát triển, kiểm thử và triển khai độc lập.</p></blockquote>' +
              '<h2>2. So sánh các kiểu render</h2>' +
              '<table><tbody>' +
              '<tr><th><p>Kiểu</p></th><th><p>Render tại</p></th><th><p>Ưu điểm</p></th></tr>' +
              '<tr><td><p>SPA</p></td><td><p>Trình duyệt</p></td><td><p>Tương tác mượt</p></td></tr>' +
              '<tr><td><p>SSR</p></td><td><p>Máy chủ</p></td><td><p>SEO tốt, tải trang đầu nhanh</p></td></tr>' +
              '<tr><td><p>SSG</p></td><td><p>Lúc build</p></td><td><p>Rất nhanh, rẻ khi triển khai</p></td></tr>' +
              '</tbody></table>' +
              '<h2>3. Monolith hay Microservices?</h2>' +
              '<ul><li><p><strong>Monolith</strong>: đơn giản, phù hợp nhóm nhỏ và giai đoạn đầu.</p></li>' +
              '<li><p><strong>Microservices</strong>: mở rộng độc lập, nhưng vận hành phức tạp hơn.</p></li></ul>',
          },
          {
            title: 'Slide bài giảng Chương 1',
            description: 'Slide và tài liệu đọc thêm cho Chương 1.',
            settings: { folderDisplay: 'INLINE' },
            resources: [
              { fileName: 'slide-chuong-1.pdf', mimeType: PDF, sizeKb: 2150 },
              { fileName: 'slide-chuong-1.pptx', mimeType: PPTX, sizeKb: 5300 },
            ],
          },
          {
            title: 'Tải Node.js 22 LTS',
            externalUrl: 'https://nodejs.org/en/download',
          },
        ],
      },
      {
        title: 'Chương 2: Backend với NestJS & Prisma',
        lessons: [
          {
            title: 'Module, Controller và Provider',
            content:
              '<p>Một ứng dụng NestJS được tổ chức thành các <strong>module</strong>, mỗi module gồm:</p>' +
              '<ol><li><p><strong>Controller</strong> — nhận request, định nghĩa route.</p></li>' +
              '<li><p><strong>Provider (Service)</strong> — xử lý nghiệp vụ, được inject qua <code>constructor</code>.</p></li></ol>' +
              '<pre><code>@Controller(\'courses\')\nexport class CourseController {\n  constructor(private readonly courseService: CourseService) {}\n}</code></pre>' +
              '<ul data-type="taskList">' +
              '<li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Đọc tài liệu về Dependency Injection</p></div></li>' +
              '<li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Tạo module đầu tiên bằng Nest CLI</p></div></li>' +
              '</ul>',
          },
          {
            title: 'Xác thực JWT và phân quyền theo vai trò',
            content: 'Access token, refresh token, Guard và decorator @Roles.',
          },
          {
            title: 'Bài thực hành: Xây dựng CRUD API (bản nháp)',
            content: 'Bài học đang soạn — sinh viên KHÔNG được nhìn thấy.',
            status: LessonStatus.DRAFT,
          },
          {
            title: 'Prisma 5 (nội dung cũ)',
            content: 'Bài học đã lưu trữ — sinh viên KHÔNG được nhìn thấy.',
            status: LessonStatus.ARCHIVED,
          },
        ],
      },
      {
        title: 'Chương 3: Frontend với Next.js',
        lessons: [
          {
            title: 'App Router và Server Components',
            content: 'Routing theo thư mục, layout lồng nhau, data fetching phía server.',
          },
          {
            title: 'Tài liệu tham khảo Next.js',
            description: 'Tổng hợp best practices khi xây dựng giao diện với Next.js.',
            settings: { showDescription: true, display: 'DOWNLOAD' },
            resources: [{ fileName: 'nextjs-best-practices.docx', mimeType: DOCX, sizeKb: 180 }],
          },
          {
            title: 'Kế hoạch đồ án cuối kỳ',
            content: 'Nhóm 3-4 sinh viên, đăng ký đề tài trước tuần 5, báo cáo tiến độ tuần 8.',
            status: LessonStatus.DRAFT,
          },
        ],
      },
      {
        // Module rỗng: test trạng thái "chưa có bài học"
        title: 'Chương 4: Triển khai ứng dụng (đang soạn)',
        lessons: [],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Môn ACTIVE thứ hai, sinh viên có tiến độ khác nhau
  // ---------------------------------------------------------------------------
  {
    code: 'CDDNHK26',
    name: 'Chuyên đề Doanh nghiệp - Nhóm 02',
    description: 'HK1 2026-2027 — Chuyên đề Doanh nghiệp ngành Công nghệ thông tin.',
    owner: 'teacher',
    status: CourseStatus.ACTIVE,
    enrollments: [{ student: 'student1' }, { student: 'student2' }, { student: 'student3' }],
    progress: { student1: 1, student3: 'all' },
    modules: [
      {
        title: 'Chung',
        lessons: [
          {
            title: 'Lịch báo cáo chuyên đề',
            content: 'Các buổi báo cáo của doanh nghiệp diễn ra vào sáng thứ 7 tại hội trường A.',
          },
          {
            title: 'Phòng Google Meet buổi báo cáo online',
            externalUrl: 'https://meet.google.com/abc-defg-hij',
          },
        ],
      },
      {
        title: 'Sinh hoạt công dân đầu khóa',
        lessons: [
          {
            title: 'Chương trình sinh hoạt công dân năm học 2026-2027',
            description: 'Nội dung, thời gian và hình thức tổ chức sinh hoạt công dân cho sinh viên hệ đại học chính quy.',
            resources: [{ fileName: 'ke-hoach-sinh-hoat-cong-dan.pdf', mimeType: PDF, sizeKb: 310 }],
          },
          {
            title: 'Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh',
            content: 'Chuyên đề năm 2026 dành cho sinh viên.',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Môn ACTIVE chưa có nội dung — test empty state
  // ---------------------------------------------------------------------------
  {
    code: 'TKPMK26X',
    name: 'Thiết kế phần mềm',
    description: 'Môn học mới tạo, giảng viên chưa soạn nội dung.',
    owner: 'teacher',
    status: CourseStatus.ACTIVE,
    enrollments: [{ student: 'student1' }],
    modules: [],
  },

  // ---------------------------------------------------------------------------
  // 4. Môn CLOSED — không cho tham gia bằng mã, sinh viên cũ vẫn xem được
  // ---------------------------------------------------------------------------
  {
    code: 'CSDLK25B',
    name: 'Cơ sở dữ liệu',
    description: 'HK2 2025-2026 — Môn học đã kết thúc.',
    owner: 'teacher',
    status: CourseStatus.CLOSED,
    enrollments: [{ student: 'student1' }, { student: 'student2' }],
    progress: { student1: 'all', student2: 1 },
    modules: [
      {
        title: 'Chương 1: Mô hình quan hệ',
        lessons: [
          { title: 'Khái niệm quan hệ, khóa chính, khóa ngoại', content: 'Lý thuyết mô hình dữ liệu quan hệ.' },
          { title: 'Chuẩn hóa dữ liệu 1NF, 2NF, 3NF', content: 'Phân rã lược đồ và phụ thuộc hàm.' },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Môn ARCHIVED — chỉ đọc, không cho sửa thông tin
  // ---------------------------------------------------------------------------
  {
    code: 'MMTK24XA',
    name: 'Mạng máy tính',
    description: 'HK1 2024-2025 — Môn học đã lưu trữ.',
    owner: 'teacher',
    status: CourseStatus.ARCHIVED,
    enrollments: [{ student: 'student1' }],
    progress: { student1: 1 },
    modules: [
      {
        title: 'Chương 1: Mô hình OSI và TCP/IP',
        lessons: [{ title: 'Các tầng của mô hình OSI', content: 'Chức năng từng tầng và giao thức tiêu biểu.' }],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. Môn của giáo viên khác — test phân quyền (teacher KHÔNG được sửa)
  // ---------------------------------------------------------------------------
  {
    code: 'JAVAK26M',
    name: 'Lập trình Java',
    description: 'Môn học do TS. Phạm Minh Khoa phụ trách.',
    owner: 'teacher2',
    status: CourseStatus.ACTIVE,
    enrollments: [{ student: 'student1' }],
    modules: [
      {
        title: 'Chương 1: Cú pháp cơ bản',
        lessons: [
          { title: 'Biến, kiểu dữ liệu và toán tử', content: 'Kiểu nguyên thủy, kiểu tham chiếu, ép kiểu.' },
          { title: 'Lập trình hướng đối tượng', content: 'Class, object, kế thừa, đa hình.' },
        ],
      },
    ],
  },
];

// Mã môn của seed cũ (trước khi gộp Classroom vào Course) — dọn dẹp nếu còn tồn tại
const LEGACY_COURSE_CODES = ['CDDN-N02', 'WEB301'];

async function seedUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const ids = {} as Record<UserKey, bigint>;

  for (const [key, u] of Object.entries(USERS) as [UserKey, (typeof USERS)[UserKey]][]) {
    const data = {
      fullName: u.fullName,
      passwordHash,
      role: u.role,
      status: u.status ?? UserStatus.ACTIVE,
      avatarUrl: u.avatarUrl,
    };
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: data,
      create: { email: u.email, ...data },
    });
    ids[key] = user.id;
  }

  return ids;
}

async function seedCourse(c: SeedCourse, userIds: Record<UserKey, bigint>) {
  const course = await prisma.course.create({
    data: {
      courseCode: c.code,
      name: c.name,
      description: c.description,
      status: c.status,
      ownerId: userIds[c.owner],
    },
  });

  for (const e of c.enrollments) {
    const status = e.status ?? EnrollmentStatus.ACTIVE;
    await prisma.enrollment.create({
      data: {
        courseId: course.id,
        studentId: userIds[e.student],
        status,
        removedAt: status === EnrollmentStatus.REMOVED ? new Date() : null,
      },
    });
  }

  const publishedLessonIds: bigint[] = [];
  let lessonCount = 0;

  // Module mặc định "Chung" luôn đứng đầu: dùng module "Chung" khai báo sẵn, nếu không có thì tạo rỗng
  const modules: SeedModule[] =
    c.modules[0]?.title === DEFAULT_MODULE_TITLE ? c.modules : [{ title: DEFAULT_MODULE_TITLE, lessons: [] }, ...c.modules];

  for (const [mIdx, m] of modules.entries()) {
    const mod = await prisma.module.create({
      data: { courseId: course.id, title: m.title, orderIndex: mIdx + 1, isDefault: mIdx === 0 },
    });

    for (const [lIdx, l] of m.lessons.entries()) {
      const status = l.status ?? LessonStatus.PUBLISHED;
      const type = resolveLessonType(l);
      // Dùng chung hàm kiểm tra / làm sạch HTML với API → dữ liệu seed hợp lệ như dữ liệu tạo từ giao diện
      const fields = buildLessonFields(type, {
        title: l.title,
        content: toHtml(l.content),
        description: toHtml(l.description),
        externalUrl: l.externalUrl,
        settings: l.settings,
      });
      const lesson = await prisma.lesson.create({
        data: {
          moduleId: mod.id,
          type,
          ...fields,
          settings: fields.settings as Prisma.InputJsonValue,
          orderIndex: lIdx + 1,
          status,
          publishedAt: status === LessonStatus.PUBLISHED ? new Date() : null,
        },
      });
      lessonCount++;
      // Chỉ bài đã đăng và không phải LABEL mới có tiến độ (khớp với LearningContentService)
      if (status === LessonStatus.PUBLISHED && type !== LessonType.LABEL) publishedLessonIds.push(lesson.id);

      for (const r of l.resources ?? []) {
        await prisma.resource.create({
          data: {
            parentType: ResourceParent.LESSON,
            lessonId: lesson.id,
            uploadedBy: userIds[c.owner],
            fileName: r.fileName,
            storageKey: `raw:classroom-hub/seed/${c.code.toLowerCase()}/${r.fileName}`,
            fileSizeBytes: BigInt(r.sizeKb * 1024),
            mimeType: r.mimeType,
          },
        });
      }
    }
  }

  for (const [student, count] of Object.entries(c.progress ?? {}) as [UserKey, number | 'all'][]) {
    const done = count === 'all' ? publishedLessonIds : publishedLessonIds.slice(0, count);
    for (const lessonId of done) {
      await prisma.lessonProgress.create({
        data: { lessonId, studentId: userIds[student], isCompleted: true, completedAt: new Date() },
      });
    }
  }

  console.log(
    `✅ ${c.code.padEnd(9)} ${c.status.padEnd(8)} ${c.name} — ${modules.length} module, ${lessonCount} bài học, ${c.enrollments.length} ghi danh`,
  );
}

async function destroyUploadedFiles(courseCodes: string[]) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return;

  const resources = await prisma.resource.findMany({
    where: {
      lesson: { module: { course: { courseCode: { in: courseCodes } } } },
      NOT: { storageKey: { contains: ':classroom-hub/seed/' } },
    },
    select: { storageKey: true },
  });
  if (!resources.length) return;

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  for (const { storageKey } of resources) {
    const idx = storageKey.indexOf(':');
    const resourceType = idx > 0 ? storageKey.slice(0, idx) : 'raw';
    const publicId = idx > 0 ? storageKey.slice(idx + 1) : storageKey;
    await cloudinary.uploader
      .destroy(publicId, { resource_type: resourceType, type: 'authenticated', invalidate: true })
      .catch(() => undefined);
  }
  console.log(`🧹 Đã dọn ${resources.length} tệp đã tải lên Cloudinary trong các môn seed`);
}

async function main() {
  // --if-changed (dùng cho db:sync tự động khi khởi động): chỉ seed khi DB trống
  // hoặc nội dung file seed đã thay đổi kể từ lần seed trước trên DB này
  if (process.argv.includes('--if-changed')) {
    const isEmpty = (await prisma.user.count()) === 0;
    const changed = readSeedState() !== SEED_HASH;
    if (!isEmpty && (!changed || process.env.SEED_AUTO === 'false')) {
      if (changed) console.log('ℹ️  Seed đã thay đổi nhưng SEED_AUTO=false — bỏ qua. Chạy "npm run seed" để cập nhật.');
      return;
    }
    console.log(isEmpty ? '🆕 DB trống → nạp dữ liệu mẫu' : '🔄 Dữ liệu mẫu đã thay đổi → nạp lại các môn học seed');
  }

  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu...');

  const userIds = await seedUsers();
  console.log(`✅ Đã tạo/cập nhật ${Object.keys(USERS).length} tài khoản`);

  const seedCodes = [...COURSES.map((c) => c.code), ...LEGACY_COURSE_CODES];

  // Tệp người dùng đã tải lên các môn seed (ngoài tệp mẫu classroom-hub/seed/...) → dọn trên Cloudinary
  await destroyUploadedFiles(seedCodes);

  // Xóa môn học seed cũ → cascade xóa enrollment, module, lesson, progress, resource
  const { count } = await prisma.course.deleteMany({
    where: { courseCode: { in: seedCodes } },
  });
  if (count > 0) console.log(`🧹 Đã xóa ${count} môn học seed cũ`);

  for (const c of COURSES) {
    await seedCourse(c, userIds);
  }

  writeSeedState();

  console.log(`
🎉 Hoàn tất! Mật khẩu chung: ${PASSWORD}

  Tài khoản                         Vai trò   Ghi chú
  admin@classroomhub.edu.vn         ADMIN
  teacher@classroomhub.edu.vn       TEACHER   Sở hữu WEBNC26A, CDDNHK26, TKPMK26X, CSDLK25B, MMTK24XA
  teacher2@classroomhub.edu.vn      TEACHER   Sở hữu JAVAK26M (test phân quyền chéo)
  student1@classroomhub.edu.vn      STUDENT   Ghi danh 6 môn, tiến độ dở dang
  student2@classroomhub.edu.vn      STUDENT   Hoàn thành 100% WEBNC26A
  student3@classroomhub.edu.vn      STUDENT   Bị xóa khỏi WEBNC26A (test tham gia lại bằng mã)
  student4@classroomhub.edu.vn      STUDENT   Chưa ghi danh môn nào (test tham gia bằng mã)
  student5@classroomhub.edu.vn      STUDENT   Tài khoản bị KHÓA
`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
