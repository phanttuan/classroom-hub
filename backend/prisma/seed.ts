import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.js';
import {
  ActivityStatus,
  AttemptGradingMethod,
  GradeCategory,
  QuestionType,
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
import { sanitizeRichHtml } from '../src/modules/learning-content/utils/html-sanitizer.js';
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

interface SeedSubmission {
  student: UserKey;
  /** HTML bài làm văn bản (hoặc văn bản thuần) */
  content?: string;
  /** Tệp mẫu đính kèm (không có trên Cloudinary — chỉ để hiển thị) */
  file?: SeedResource;
  /** Nộp sau hạn — chỉ dùng cho bài tập cho phép nộp trễ */
  late?: boolean;
}

interface SeedAssignment {
  /** Tiêu đề module chứa bài tập */
  module: string;
  title: string;
  description?: string;
  maxScore?: number; // mặc định 10
  /** Số ngày tính từ lúc seed: âm = quá khứ, dương = tương lai */
  opensInDays: number;
  dueInDays: number;
  status?: ActivityStatus; // mặc định PUBLISHED
  allowLateSubmission?: boolean;
  allowTextSubmission?: boolean;
  allowFileSubmission?: boolean;
  submissions?: SeedSubmission[];
}

interface SeedQuizQuestion {
  content: string;
  type?: 'SINGLE' | 'MULTIPLE';
  /** Điểm câu hỏi (mặc định 1) */
  score?: number;
  /** [nội dung, đúng?] */
  choices: [string, boolean][];
}

interface SeedQuiz {
  module: string;
  title: string;
  instructions?: string;
  opensInDays: number;
  dueInDays: number;
  durationMinutes?: number;
  maxAttempts?: number;
  attemptGrading?: AttemptGradingMethod;
  scoringEnabled?: boolean;
  showAnswersAfterSubmit?: boolean;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  status?: ActivityStatus; // mặc định PUBLISHED
  questions: SeedQuizQuestion[];
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
  assignments?: SeedAssignment[];
  quizzes?: SeedQuiz[];
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
    // Bài tập: đủ các tình huống nộp bài (đang mở / quá hạn cho nộp trễ / quá hạn không nhận / chỉ tệp / nháp)
    assignments: [
      {
        module: 'Chương 1: Tổng quan & chuẩn bị môi trường',
        title: 'Bài tập 1: Thiết lập môi trường và Git',
        description:
          '<p>Cài đặt Node.js, PostgreSQL và tạo repository trên GitHub.</p><ul><li>Nộp <strong>đường dẫn repository</strong> trong bài làm văn bản.</li><li>Đính kèm ảnh chụp màn hình <code>npm run start:dev</code> chạy thành công (nén .zip nếu nhiều ảnh).</li></ul>',
        opensInDays: -7,
        dueInDays: 5,
        submissions: [
          { student: 'student1', content: 'Repo: https://github.com/student1/classroom-hub-lab1', file: { fileName: 'lab1-screenshots.zip', mimeType: 'application/zip', sizeKb: 860 } },
          { student: 'student2', content: 'Repo: https://github.com/student2/web-lab1' },
        ],
      },
      {
        module: 'Chương 2: Backend với NestJS & Prisma',
        title: 'Bài tập 2: Thiết kế schema Prisma cho hệ thống quản lý khóa học',
        description:
          '<p>Thiết kế schema gồm <em>User, Course, Enrollment</em>. Giải thích lựa chọn khóa ngoại và ràng buộc.</p><p><strong>Cho phép nộp trễ</strong> — bài nộp sau hạn sẽ được đánh dấu "Nộp trễ".</p>',
        opensInDays: -14,
        dueInDays: -2,
        allowLateSubmission: true,
        submissions: [
          { student: 'student2', content: '<h3>Schema</h3><p>Ba bảng với quan hệ nhiều-nhiều qua Enrollment...</p>', file: { fileName: 'schema.prisma', mimeType: 'text/plain', sizeKb: 6 } },
          { student: 'student1', content: '<p>Em nộp trễ do ốm, mong thầy thông cảm.</p>', late: true },
        ],
      },
      {
        module: 'Chương 2: Backend với NestJS & Prisma',
        title: 'Bài tập 3: Viết REST API CRUD cho Course (chỉ nhận tệp)',
        description: '<p>Nén mã nguồn thành <strong>.zip</strong> (không kèm node_modules) và nộp. Không nhận bài làm văn bản, <strong>không nhận bài nộp trễ</strong>.</p>',
        maxScore: 100,
        opensInDays: -10,
        dueInDays: -1,
        allowTextSubmission: false,
        submissions: [{ student: 'student2', file: { fileName: 'course-api.zip', mimeType: 'application/zip', sizeKb: 2450 } }],
      },
      {
        module: 'Chương 3: Frontend với Next.js',
        title: 'Bài tập 4: Trang danh sách khóa học với Next.js (chỉ bài làm văn bản)',
        description: '<p>Trình bày cách tổ chức component và gọi API trong bài làm văn bản. Không cần đính kèm tệp.</p>',
        opensInDays: 3,
        dueInDays: 14,
        allowFileSubmission: false,
      },
      {
        module: 'Chương 4: Triển khai ứng dụng (đang soạn)',
        title: 'Bài tập 5: Triển khai lên Vercel + Render (đang soạn)',
        opensInDays: 10,
        dueInDays: 24,
        status: ActivityStatus.DRAFT,
      },
    ],
    // Đề kiểm tra: đủ tình huống làm bài (có giờ / không giờ, 1 lượt / nhiều lượt, trộn đề, không chấm điểm, nháp)
    quizzes: [
      {
        module: 'Chương 1: Tổng quan & chuẩn bị môi trường',
        title: 'Kiểm tra nhanh Chương 1: HTML, CSS & Git',
        instructions: '<p>15 phút, <strong>2 lượt</strong> làm bài — lấy <strong>điểm cao nhất</strong>. Đáp án hiện ngay sau khi nộp.</p>',
        opensInDays: -3,
        dueInDays: 10,
        durationMinutes: 15,
        maxAttempts: 2,
        attemptGrading: 'HIGHEST',
        showAnswersAfterSubmit: true,
        shuffleQuestions: true,
        shuffleChoices: true,
        questions: [
          { content: 'Thẻ HTML nào dùng để tạo liên kết?', choices: [['<a>', true], ['<link>', false], ['<href>', false], ['<nav>', false]] },
          { content: 'Thuộc tính CSS nào đặt khoảng cách bên trong phần tử?', choices: [['margin', false], ['padding', true], ['gap', false], ['border', false]] },
          { content: 'Lệnh Git nào tạo nhánh mới và chuyển sang nhánh đó?', choices: [['git branch new', false], ['git checkout -b new', true], ['git merge new', false], ['git switch', false]] },
          { content: 'Những thẻ nào là thẻ ngữ nghĩa (semantic) trong HTML5?', type: 'MULTIPLE', score: 2, choices: [['<header>', true], ['<article>', true], ['<div>', false], ['<span>', false]] },
          { content: 'Flexbox: thuộc tính nào căn các phần tử theo trục chính?', choices: [['align-items', false], ['justify-content', true], ['flex-wrap', false], ['order', false]] },
        ],
      },
      {
        module: 'Chương 2: Backend với NestJS & Prisma',
        title: 'Kiểm tra Chương 2: NestJS & Prisma cơ bản',
        instructions: '<p>20 phút, <strong>1 lượt duy nhất</strong>. Không hiện đáp án sau khi nộp.</p>',
        opensInDays: -5,
        dueInDays: 5,
        durationMinutes: 20,
        maxAttempts: 1,
        questions: [
          { content: 'Decorator nào đánh dấu một class là provider có thể inject trong NestJS?', choices: [['@Injectable()', true], ['@Module()', false], ['@Controller()', false], ['@Provider()', false]] },
          { content: 'Lệnh Prisma nào áp dụng migration vào cơ sở dữ liệu?', choices: [['prisma generate', false], ['prisma migrate deploy', true], ['prisma studio', false], ['prisma format', false]] },
          { content: 'Những thành phần nào thuộc pipeline xử lý request của NestJS?', type: 'MULTIPLE', score: 2, choices: [['Guard', true], ['Interceptor', true], ['Pipe', true], ['Reducer', false]] },
          { content: 'HTTP status nào phù hợp khi tạo mới tài nguyên thành công?', choices: [['200', false], ['201', true], ['204', false], ['302', false]] },
        ],
      },
      {
        module: 'Chương 2: Backend với NestJS & Prisma',
        title: 'Kiểm tra giữa kỳ: 40 câu tổng hợp Web',
        instructions:
          '<p><strong>40 câu</strong> trong <strong>45 phút</strong>, 2 lượt — lấy điểm cao nhất. Câu nhiều đáp án tính <em>2 điểm</em>, chỉ đúng khi chọn đủ và không thừa.</p>',
        opensInDays: -2,
        dueInDays: 12,
        durationMinutes: 45,
        maxAttempts: 2,
        attemptGrading: 'HIGHEST',
        showAnswersAfterSubmit: true,
        shuffleQuestions: true,
        shuffleChoices: true,
        questions: [
          { content: 'HTTP method nào dùng để cập nhật một phần tài nguyên?', choices: [['PATCH', true], ['PUT', false], ['POST', false], ['GET', false]] },
          { content: 'Mã trạng thái 404 có nghĩa là gì?', choices: [['Không tìm thấy tài nguyên', true], ['Không có quyền', false], ['Lỗi máy chủ', false], ['Tạo thành công', false]] },
          { content: 'Trong REST, tài nguyên nên được định danh bằng gì?', choices: [['URL (URI)', true], ['Header Accept', false], ['Cookie', false], ['Query string bắt buộc', false]] },
          { content: 'JWT gồm mấy phần ngăn cách bởi dấu chấm?', choices: [['3', true], ['2', false], ['4', false], ['1', false]] },
          { content: 'Những mã trạng thái nào thuộc nhóm lỗi phía client (4xx)?', type: 'MULTIPLE', score: 2, choices: [['400', true], ['401', true], ['500', false], ['302', false]] },
          { content: 'Decorator nào định nghĩa route POST trong NestJS?', choices: [['@Post()', true], ['@Route("POST")', false], ['@Create()', false], ['@Http.Post', false]] },
          { content: 'Pipe trong NestJS thường dùng để làm gì?', choices: [['Kiểm tra và chuyển đổi dữ liệu vào', true], ['Render giao diện', false], ['Quản lý kết nối DB', false], ['Ghi log truy cập', false]] },
          { content: 'Guard trong NestJS trả về gì để cho phép request đi tiếp?', choices: [['true', true], ['Response object', false], ['next()', false], ['undefined', false]] },
          { content: 'Thành phần nào của NestJS gom controller và provider thành một đơn vị?', choices: [['Module', true], ['Service', false], ['Interceptor', false], ['Middleware', false]] },
          { content: 'Những decorator nào là của NestJS?', type: 'MULTIPLE', score: 2, choices: [['@Injectable()', true], ['@Controller()', true], ['@Component()', false], ['@Service()', false]] },
          { content: 'Prisma Client được sinh ra bằng lệnh nào?', choices: [['prisma generate', true], ['prisma migrate dev', false], ['prisma db pull', false], ['prisma studio', false]] },
          { content: 'Trong schema Prisma, @id dùng để làm gì?', choices: [['Khai báo khóa chính', true], ['Tạo chỉ mục phụ', false], ['Đặt giá trị mặc định', false], ['Khai báo quan hệ', false]] },
          { content: 'Quan hệ một-nhiều trong Prisma khai báo bằng?', choices: [['@relation với fields và references', true], ['@index', false], ['@unique', false], ['@map', false]] },
          { content: 'Thuộc tính nào giúp Prisma tự cập nhật thời gian sửa đổi?', choices: [['@updatedAt', true], ['@default(now())', false], ['@map("updated_at")', false], ['@db.Timestamptz', false]] },
          { content: 'Những thao tác nào Prisma Client hỗ trợ trực tiếp?', type: 'MULTIPLE', score: 2, choices: [['findMany', true], ['upsert', true], ['selectAll', false], ['fetchOne', false]] },
          { content: 'Kiểu dữ liệu nào trong PostgreSQL lưu JSON có đánh chỉ mục?', choices: [['JSONB', true], ['TEXT', false], ['BYTEA', false], ['XML', false]] },
          { content: 'Ràng buộc UNIQUE đảm bảo điều gì?', choices: [['Giá trị cột không trùng nhau', true], ['Cột không NULL', false], ['Cột là khóa ngoại', false], ['Cột tự tăng', false]] },
          { content: 'ON DELETE CASCADE có tác dụng gì?', choices: [['Xóa bản ghi con khi xóa bản ghi cha', true], ['Chặn xóa bản ghi cha', false], ['Đặt NULL cho khóa ngoại', false], ['Sao lưu bản ghi', false]] },
          { content: 'Transaction đảm bảo tính chất nào sau đây?', choices: [['Tất cả hoặc không gì cả', true], ['Tốc độ cao hơn', false], ['Tự động đánh chỉ mục', false], ['Nén dữ liệu', false]] },
          { content: 'Những câu lệnh nào thuộc nhóm DML?', type: 'MULTIPLE', score: 2, choices: [['INSERT', true], ['UPDATE', true], ['CREATE TABLE', false], ['GRANT', false]] },
          { content: 'Trong Next.js App Router, file nào tạo layout dùng chung?', choices: [['layout.tsx', true], ['template.html', false], ['_app.tsx', false], ['shell.tsx', false]] },
          { content: 'Server Component không thể làm gì?', choices: [['Dùng useState', true], ['Đọc dữ liệu từ DB', false], ['Render HTML', false], ['Import component khác', false]] },
          { content: 'Hook nào dùng để lấy tham số động của route trong Client Component?', choices: [['useParams', true], ['useQuery', false], ['useRoute', false], ['useSegment', false]] },
          { content: 'Thư mục nào chứa tệp tĩnh (ảnh, favicon) trong Next.js?', choices: [['public', true], ['static', false], ['assets', false], ['resources', false]] },
          { content: 'Những cách nào hợp lệ để điều hướng trong Next.js?', type: 'MULTIPLE', score: 2, choices: [['<Link href="…">', true], ['router.push("…")', true], ['window.navigate("…")', false], ['<Route to="…">', false]] },
          { content: 'React: hook nào dùng để chạy hiệu ứng phụ sau khi render?', choices: [['useEffect', true], ['useMemo', false], ['useRef', false], ['useCallback', false]] },
          { content: 'Prop nào bắt buộc khi render danh sách phần tử trong React?', choices: [['key', true], ['id', false], ['index', false], ['ref', false]] },
          { content: 'useMemo dùng để làm gì?', choices: [['Ghi nhớ kết quả tính toán tốn kém', true], ['Tạo state', false], ['Gọi API', false], ['Điều hướng trang', false]] },
          { content: 'Controlled input trong React là input mà giá trị được quản lý bởi?', choices: [['State của component', true], ['DOM', false], ['localStorage', false], ['URL', false]] },
          { content: 'Những hook nào có sẵn trong React?', type: 'MULTIPLE', score: 2, choices: [['useState', true], ['useReducer', true], ['useFetch', false], ['useStore', false]] },
          { content: 'Tailwind CSS: lớp nào đặt khoảng cách giữa các phần tử flex?', choices: [['gap-4', true], ['space-4', false], ['margin-4', false], ['pad-4', false]] },
          { content: 'Lớp Tailwind nào ẩn phần tử trên màn hình nhỏ và hiện từ md trở lên?', choices: [['hidden md:block', true], ['md:hidden', false], ['block sm:hidden', false], ['invisible md:visible', false]] },
          { content: 'TypeScript: từ khóa nào khai báo kiểu cho object?', choices: [['interface', true], ['struct', false], ['schema', false], ['model', false]] },
          { content: 'Kiểu nào biểu diễn giá trị có thể là string hoặc number?', choices: [['string | number', true], ['string & number', false], ['string, number', false], ['any<string, number>', false]] },
          { content: 'Những phát biểu nào đúng về async/await?', type: 'MULTIPLE', score: 2, choices: [['await chỉ dùng trong hàm async', true], ['Hàm async luôn trả về Promise', true], ['await chặn toàn bộ event loop', false], ['async thay thế hoàn toàn Promise', false]] },
          { content: 'Git: lệnh nào đưa thay đổi lên remote?', choices: [['git push', true], ['git pull', false], ['git fetch', false], ['git commit', false]] },
          { content: 'Git: lệnh nào gộp nhánh khác vào nhánh hiện tại?', choices: [['git merge', true], ['git branch', false], ['git stash', false], ['git tag', false]] },
          { content: 'CORS là cơ chế do ai thực thi?', choices: [['Trình duyệt', true], ['Máy chủ DB', false], ['Hệ điều hành', false], ['DNS', false]] },
          { content: 'Cách nào an toàn để lưu mật khẩu người dùng?', choices: [['Băm với bcrypt/argon2 kèm salt', true], ['Mã hóa AES rồi lưu khóa cạnh DB', false], ['Lưu dạng base64', false], ['Lưu nguyên văn trong cột riêng', false]] },
          { content: 'Những biện pháp nào giúp chống XSS?', type: 'MULTIPLE', score: 2, choices: [['Làm sạch (sanitize) HTML đầu vào', true], ['Escape dữ liệu khi render', true], ['Tăng kích thước cookie', false], ['Dùng HTTP thay HTTPS', false]] },
        ],
      },
      {
        module: 'Chương 3: Frontend với Next.js',
        title: 'Tự luyện Chương 3: Next.js (không tính điểm)',
        instructions: '<p>Bài luyện tập: không giới hạn thời gian, <strong>3 lượt</strong>, không vào sổ điểm.</p>',
        opensInDays: -1,
        dueInDays: 20,
        maxAttempts: 3,
        attemptGrading: 'AVERAGE',
        scoringEnabled: false,
        showAnswersAfterSubmit: true,
        questions: [
          { content: 'Trong App Router, file nào định nghĩa giao diện cho một route?', choices: [['page.tsx', true], ['route.tsx', false], ['index.tsx', false], ['view.tsx', false]] },
          { content: '"use client" dùng để làm gì?', choices: [['Đánh dấu Client Component', true], ['Bật chế độ production', false], ['Tắt SSR toàn bộ ứng dụng', false], ['Khai báo API route', false]] },
          { content: 'Hook nào của Next.js dùng để điều hướng trong Client Component?', choices: [['useRouter', true], ['useNavigate', false], ['useHistory', false], ['useLink', false]] },
        ],
      },
      {
        module: 'Chương 4: Triển khai ứng dụng (đang soạn)',
        title: 'Kiểm tra cuối kỳ (đang soạn)',
        opensInDays: 15,
        dueInDays: 16,
        durationMinutes: 60,
        status: ActivityStatus.DRAFT,
        questions: [{ content: 'Câu hỏi nháp', choices: [['A', true], ['B', false]] }],
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
  const moduleIds = new Map<string, bigint>();
  let lessonCount = 0;

  // Module mặc định "Chung" luôn đứng đầu: dùng module "Chung" khai báo sẵn, nếu không có thì tạo rỗng
  const modules: SeedModule[] =
    c.modules[0]?.title === DEFAULT_MODULE_TITLE ? c.modules : [{ title: DEFAULT_MODULE_TITLE, lessons: [] }, ...c.modules];

  for (const [mIdx, m] of modules.entries()) {
    const mod = await prisma.module.create({
      data: { courseId: course.id, title: m.title, orderIndex: mIdx + 1, isDefault: mIdx === 0 },
    });
    moduleIds.set(m.title, mod.id);

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

  const assignmentCount = await seedAssignments(c, course.id, moduleIds, userIds);
  await seedQuizzes(c, course.id, moduleIds, userIds);

  console.log(
    `✅ ${c.code.padEnd(9)} ${c.status.padEnd(8)} ${c.name} — ${modules.length} module, ${lessonCount} bài học, ${assignmentCount} bài tập, ${c.enrollments.length} ghi danh`,
  );
}

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Đề kiểm tra mẫu: câu hỏi nằm trong bộ "Seed · <mã môn>" của giáo viên phụ trách (xóa & tạo lại mỗi lần seed),
 * QuizQuestion snapshot và GradeItem chốt tổng điểm giống QuizService.publish.
 */
async function seedQuizzes(c: SeedCourse, courseId: bigint, moduleIds: Map<string, bigint>, userIds: Record<UserKey, bigint>) {
  if (!c.quizzes?.length) return;
  const ownerId = userIds[c.owner];
  const setName = `Seed · ${c.code}`;

  // Dọn bộ câu hỏi seed cũ (quiz của môn đã bị xóa ở bước trước nên không còn ràng buộc Restrict)
  const oldSet = await prisma.questionSet.findUnique({ where: { uk_question_sets_owner_name: { ownerId, name: setName } } });
  if (oldSet) {
    await prisma.questionBank.deleteMany({ where: { setId: oldSet.id } });
    await prisma.questionSet.delete({ where: { id: oldSet.id } });
  }
  const set = await prisma.questionSet.create({ data: { ownerId, name: setName } });

  for (const q of c.quizzes) {
    const moduleId = moduleIds.get(q.module);
    if (!moduleId) throw new Error(`Seed ${c.code}: không tìm thấy module "${q.module}" cho đề "${q.title}"`);
    const status = q.status ?? ActivityStatus.PUBLISHED;
    const scoringEnabled = q.scoringEnabled ?? true;

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        moduleId,
        createdBy: ownerId,
        title: q.title,
        instructions: sanitizeRichHtml(toHtml(q.instructions)) || null,
        openAt: daysFromNow(q.opensInDays),
        dueAt: daysFromNow(q.dueInDays),
        durationMinutes: q.durationMinutes ?? null,
        maxAttempts: q.maxAttempts ?? 1,
        scoringEnabled,
        showAnswersAfterSubmit: q.showAnswersAfterSubmit ?? false,
        attemptGrading: q.attemptGrading ?? AttemptGradingMethod.HIGHEST,
        shuffleQuestions: q.shuffleQuestions ?? false,
        shuffleChoices: q.shuffleChoices ?? false,
        status,
        publishedAt: status === ActivityStatus.PUBLISHED ? new Date() : null,
      },
    });

    let total = new Prisma.Decimal(0);
    for (const [idx, sq] of q.questions.entries()) {
      const score = new Prisma.Decimal(sq.score ?? 1);
      const question = await prisma.questionBank.create({
        data: {
          ownerId,
          setId: set.id,
          content: sq.content,
          questionType: sq.type === 'MULTIPLE' ? QuestionType.MULTIPLE : QuestionType.SINGLE,
          defaultScore: score,
          choices: { create: sq.choices.map(([content, isCorrect], i) => ({ content, isCorrect, orderIndex: i + 1 })) },
        },
        include: { choices: { orderBy: { orderIndex: 'asc' } } },
      });
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          questionId: question.id,
          orderIndex: idx + 1,
          maxScore: score,
          questionSnapshot: {
            questionId: question.id.toString(),
            questionKey: question.questionKey,
            version: question.version,
            content: question.content,
            questionType: question.questionType,
            defaultScore: score.toFixed(2),
            choices: question.choices.map((ch) => ({ id: ch.id.toString(), content: ch.content, isCorrect: ch.isCorrect, orderIndex: ch.orderIndex })),
          },
        },
      });
      total = total.plus(score);
    }
    if (scoringEnabled) {
      await prisma.gradeItem.create({
        data: { courseId, category: GradeCategory.QUIZ, quizId: quiz.id, maxScore: status === ActivityStatus.PUBLISHED ? total : new Prisma.Decimal(0) },
      });
    }
  }
}

/** Bài tập kèm GradeItem (như AssignmentService.create) và bài nộp mẫu (như SubmissionService.upsert) */
async function seedAssignments(
  c: SeedCourse,
  courseId: bigint,
  moduleIds: Map<string, bigint>,
  userIds: Record<UserKey, bigint>,
) {
  // Bài tập xếp sau các bài học của topic (cùng dãy orderIndex với Lesson)
  const positionByModule = new Map<string, number>();
  for (const a of c.assignments ?? []) {
    const moduleId = moduleIds.get(a.module);
    if (!moduleId) throw new Error(`Seed ${c.code}: không tìm thấy module "${a.module}" cho bài tập "${a.title}"`);
    const lessonCount = c.modules.find((m) => m.title === a.module)?.lessons.length ?? 0;
    const orderIndex = lessonCount + (positionByModule.get(a.module) ?? 0) + 1;
    positionByModule.set(a.module, orderIndex - lessonCount);
    const status = a.status ?? ActivityStatus.PUBLISHED;
    const maxScore = new Prisma.Decimal(a.maxScore ?? 10);
    const dueAt = daysFromNow(a.dueInDays);

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        moduleId,
        createdBy: userIds[c.owner],
        title: a.title,
        description: sanitizeRichHtml(toHtml(a.description)) || null,
        maxScore,
        openAt: daysFromNow(a.opensInDays),
        dueAt,
        status,
        publishedAt: status === ActivityStatus.PUBLISHED ? new Date() : null,
        orderIndex,
        allowLateSubmission: a.allowLateSubmission ?? false,
        allowTextSubmission: a.allowTextSubmission ?? true,
        allowFileSubmission: a.allowFileSubmission ?? true,
      },
    });
    await prisma.gradeItem.create({
      data: { courseId, category: GradeCategory.ASSIGNMENT, assignmentId: assignment.id, maxScore },
    });

    for (const s of a.submissions ?? []) {
      // Nộp trễ: 1 ngày sau hạn; đúng hạn: 1 ngày trước hạn (hoặc hôm nay nếu hạn còn xa)
      const submittedAt = s.late
        ? new Date(dueAt.getTime() + 24 * 60 * 60 * 1000)
        : new Date(Math.min(Date.now(), dueAt.getTime() - 24 * 60 * 60 * 1000));
      const submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: userIds[s.student],
          content: sanitizeRichHtml(toHtml(s.content)) || null,
          isLate: Boolean(s.late),
          submittedAt,
        },
      });
      if (s.file) {
        await prisma.resource.create({
          data: {
            parentType: ResourceParent.SUBMISSION,
            submissionId: submission.id,
            uploadedBy: userIds[s.student],
            fileName: s.file.fileName,
            storageKey: `raw:classroom-hub/seed/${c.code.toLowerCase()}/submissions/${s.file.fileName}`,
            fileSizeBytes: BigInt(s.file.sizeKb * 1024),
            mimeType: s.file.mimeType,
          },
        });
      }
    }
  }
  return c.assignments?.length ?? 0;
}

async function destroyUploadedFiles(courseCodes: string[]) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return;

  // Tệp tài liệu bài học + tệp bài nộp của sinh viên trong các môn seed
  const resources = await prisma.resource.findMany({
    where: {
      OR: [
        { lesson: { module: { course: { courseCode: { in: courseCodes } } } } },
        { submission: { assignment: { course: { courseCode: { in: courseCodes } } } } },
      ],
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

  // Lượt làm bài trắc nghiệm giữ FK Restrict tới quiz_questions → phải xóa trước khi xóa môn
  await prisma.quizAttempt.deleteMany({ where: { quiz: { course: { courseCode: { in: seedCodes } } } } });

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
