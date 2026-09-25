/**
 * Mock data hardcore cho khu vực học sinh (/student).
 * Gom chung 1 file theo role để dễ thay bằng API thật sau này
 * (tách nhỏ hơn khi cần: student-dashboard.ts, student-study.ts...).
 */
import type {
  AssignmentComment,
  ContentClassGroup,
  DayScheduleItem,
  GradeRow,
  StudentAssignment,
  StudentClass,
  StudentDeadline,
  StudentDoc,
  StudentInboxItem,
  StudentNotif,
  StudentProfile,
  StudentQuiz,
  StudentRecentScore,
  WeekEvent,
} from "@/lib/types/student";

export const greetingDateLabel = "Thứ Tư, 24 tháng 9, 2026";

export const studentProfile: StudentProfile = {
  fullName: "Nguyễn Thảo Chi",
  role: "Sinh viên",
  avatarUrl: "/images/student.webp",
  mssv: "2311ST2B",
  year: "Sinh viên năm 3",
  major: "Công nghệ thông tin - Kỹ thuật phần mềm",
  university: "Trường Đại học Sư phạm Kỹ thuật TP. Hồ Chí Minh (HCMUTE)",
  email: "2311st2b@hcmute.edu.vn",
  phone: "0333 123 456",
  birthDate: "12/03/2005",
  gender: "Nam",
  address: "Thủ Đức, TP. Hồ Chí Minh",
  bio: "Mình là sinh viên ngành Công nghệ thông tin, yêu thích lập trình web và phát triển phần mềm. Mong muốn học hỏi thêm nhiều kiến thức và tham gia các dự án thực tế.",
  hobbies: ["Lập trình", "Công nghệ", "Đọc sách", "Bóng đá"],
  github: "github.com/nguyenthaochi",
  linkedin: "linkedin.com/in/nguyenthaochi",
};

export const studentClasses: StudentClass[] = [
  {
    id: "c-web301", code: "WEB301", name: "Lập trình Web nâng cao",
    teacher: "Nguyễn Văn A", progress: 45, status: "studying",
    lessonsDone: 9, lessonsTotal: 20, currentScore: 8.5,
    coverGradient: "from-amber-100 via-orange-100 to-stone-300", coverEmoji: "💻",
    timeRange: "01/09/2026 - 15/12/2026", scheduleText: "Thứ 2, Thứ 4 (10:00 - 11:30)",
    room: "Phòng 301", assignmentNote: "3 bài • 1 sắp đến hạn", quizNote: "2 bài • 1 sắp đến hạn",
  },
  {
    id: "c-py101", code: "PY101", name: "Lập trình Python cơ bản",
    teacher: "Trần Thị B", progress: 70, status: "studying",
    lessonsDone: 14, lessonsTotal: 20, currentScore: 9.0,
    coverGradient: "from-slate-900 via-blue-950 to-slate-800", coverEmoji: "🐍",
    timeRange: "28/08/2026 - 10/12/2026", scheduleText: "Thứ 3, Thứ 5 (08:00 - 09:30)",
    room: "Phòng 201", assignmentNote: "4 bài • 2 sắp đến hạn", quizNote: "3 bài • 1 sắp đến hạn",
  },
  {
    id: "c-db201", code: "DB201", name: "Cơ sở dữ liệu",
    teacher: "Lê Minh C", progress: 100, status: "finished",
    lessonsDone: 20, lessonsTotal: 20, currentScore: 7.0,
    coverGradient: "from-blue-950 via-blue-800 to-cyan-700", coverEmoji: "🗄️",
    timeRange: "15/05/2026 - 20/08/2026", scheduleText: "Thứ 6 (13:00 - 16:00)",
    room: "Phòng 203", assignmentNote: "8 bài", quizNote: "5 bài",
  },
  {
    id: "c-web302", code: "WEB302", name: "Phát triển API với Node.js",
    teacher: "Phạm Gia D", progress: 0, status: "upcoming",
    lessonsDone: 0, lessonsTotal: 18, currentScore: null,
    coverGradient: "from-emerald-950 via-green-900 to-lime-800", coverEmoji: "⬢",
  },
];

export const studentDeadlines: StudentDeadline[] = [
  { id: "d1", kind: "assignment", title: "Bài tập 2: JavaScript cơ bản", course: "Lập trình Web nâng cao", dueLabel: "Hạn nộp: 25/09/2026 23:59", daysLeft: "Còn 1 ngày", tone: "red" },
  { id: "d2", kind: "quiz", title: "Kiểm tra 2: HTML & CSS", course: "Lập trình Web nâng cao", dueLabel: "Thời gian làm: 26/09/2026 08:00 - 09:00", daysLeft: "Còn 2 ngày", tone: "purple" },
  { id: "d3", kind: "assignment", title: "Bài tập 3: API với Node.js", course: "Lập trình Web nâng cao", dueLabel: "Hạn nộp: 28/09/2026 23:59", daysLeft: "Còn 4 ngày", tone: "red" },
  { id: "d4", kind: "quiz", title: "Kiểm tra 1: Python cơ bản", course: "Lập trình Python cơ bản", dueLabel: "Thời gian làm: 30/09/2026 08:00 - 09:00", daysLeft: "Còn 6 ngày", tone: "purple" },
];

export const studentRecentScores: StudentRecentScore[] = [
  { id: "s1", title: "Bài tập 1: HTML & CSS", code: "WEB301", score: 8.5, date: "15/09/2026" },
  { id: "s2", title: "Kiểm tra 1: Python cơ bản", code: "PY101", score: 9.0, date: "12/09/2026" },
  { id: "s3", title: "Bài tập 1: Cơ sở dữ liệu", code: "DB201", score: 7.0, date: "10/09/2026" },
];

export const studentNotifs: StudentNotif[] = [
  { id: "n1", title: "Giảng viên đã đăng bài tập mới", desc: "Bài tập 3: API với Node.js đã được đăng cho lớp WEB301.", timeAgo: "2 giờ trước", unread: true, tone: "red" },
  { id: "n2", title: "Lịch kiểm tra đã được cập nhật", desc: "Thời gian kiểm tra 1: Python cơ bản đã được điều chỉnh.", timeAgo: "5 giờ trước", unread: true, tone: "purple" },
  { id: "n3", title: "Thông báo từ giảng viên", desc: "Buổi học ngày mai sẽ được tổ chức qua Google Meet.", timeAgo: "1 ngày trước", unread: false, tone: "blue" },
];

export const studentDocs: StudentDoc[] = [
  { id: "doc1", title: "Slide - Responsive Web Design", meta: "WEB301 • 2.5 MB", timeAgo: "1 ngày trước" },
  { id: "doc2", title: "Bài giảng - API với Node.js", meta: "WEB301 • 45 phút", timeAgo: "2 ngày trước" },
  { id: "doc3", title: "Tài liệu - Cơ sở dữ liệu nâng cao", meta: "DB201 • 3.1 MB", timeAgo: "3 ngày trước" },
];

export const daySchedule24: DayScheduleItem[] = [
  { id: "e1", time: "08:00 - 09:00", title: "Kiểm tra 2: HTML & CSS", meta: "Lớp: WEB301 - Phòng thi trực tuyến", action: "quiz", tone: "purple" },
  { id: "e2", time: "10:00 - 11:00", title: "Buổi học: Responsive Web Design", meta: "Lớp: WEB301 - Google Meet", action: "join", tone: "blue" },
  { id: "e3", time: "14:00 - 15:30", title: "Thảo luận nhóm dự án", meta: "Lớp: WEB301 - Phòng 301", action: "none", tone: "orange" },
];

/* ---------- Nội dung học tập ---------- */
export const contentGroups: ContentClassGroup[] = [
  {
    classId: "c-web301", code: "WEB301", name: "Lập trình Web nâng cao", teacher: "Nguyễn Văn A",
    status: "studying", progress: 45, lessonsDone: 9, lessonsTotal: 20,
    coverGradient: "from-amber-100 via-orange-100 to-stone-300", coverEmoji: "💻",
    items: [
      { id: "w1", title: "Bài 1: Tổng quan về Web nâng cao", meta: "Video • 28 phút", type: "video", state: "done" },
      { id: "w2", title: "Bài 2: HTML5 nâng cao", meta: "Tài liệu • PDF • 1.2 MB", type: "doc", state: "done" },
      { id: "w3", title: "Bài 3: CSS Grid & Flexbox", meta: "Video • 35 phút", type: "video", state: "doing" },
    ],
  },
  {
    classId: "c-py101", code: "PY101", name: "Lập trình Python cơ bản", teacher: "Trần Thị B",
    status: "studying", progress: 70, lessonsDone: 14, lessonsTotal: 20,
    coverGradient: "from-slate-900 via-blue-950 to-slate-800", coverEmoji: "🐍",
    items: [
      { id: "p1", title: "Bài 4: Hàm trong Python", meta: "Video • 22 phút", type: "video", state: "done" },
      { id: "p2", title: "Bài 5: Xử lý file", meta: "Tài liệu • PPTX • 2.4 MB", type: "doc", state: "doing" },
      { id: "p3", title: "Bài 6: Bài tập thực hành", meta: "Liên kết • Google Colab", type: "link", state: "todo" },
    ],
  },
  {
    classId: "c-db201", code: "DB201", name: "Cơ sở dữ liệu", teacher: "Lê Minh C",
    status: "finished", progress: 100, lessonsDone: 20, lessonsTotal: 20,
    coverGradient: "from-blue-950 via-blue-800 to-cyan-700", coverEmoji: "🗄️",
    items: [
      { id: "d10", title: "Bài 10: Thiết kế cơ sở dữ liệu", meta: "Video • 40 phút", type: "video", state: "done" },
      { id: "d11", title: "Bài 11: SQL nâng cao", meta: "Tài liệu • PDF • 1.5 MB", type: "doc", state: "done" },
      { id: "d12", title: "Bài 12: Dự án cuối khóa", meta: "Khác • Hướng dẫn dự án", type: "other", state: "done" },
    ],
  },
  {
    classId: "c-web302", code: "WEB302", name: "Phát triển API với Node.js", teacher: "Phạm Gia D",
    status: "upcoming", progress: 0, lessonsDone: 0, lessonsTotal: 18,
    coverGradient: "from-emerald-950 via-green-900 to-lime-800", coverEmoji: "⬢",
    items: [
      { id: "n1", title: "Bài 1: Giới thiệu Node.js", meta: "Video • 25 phút", type: "video", state: "todo" },
      { id: "n2", title: "Bài 2: Express.js cơ bản", meta: "Tài liệu • PDF • 1.1 MB", type: "doc", state: "todo" },
      { id: "n3", title: "Bài 3: Xây dựng RESTful API", meta: "Video • 32 phút", type: "video", state: "todo" },
    ],
  },
];

export const recentActivities = [
  { id: "a1", title: "Đã hoàn thành bài học", desc: "Bài 3: CSS Grid & Flexbox", time: "2 giờ trước", tone: "green" as const },
  { id: "a2", title: "Đã xem tài liệu", desc: "Bài 2: HTML5 nâng cao", time: "5 giờ trước", tone: "red" as const },
  { id: "a3", title: "Đã làm bài tập", desc: "Bài tập 1: JavaScript cơ bản", time: "1 ngày trước", tone: "purple" as const },
  { id: "a4", title: "Đã xem video", desc: "Bài 1: Tổng quan về Web nâng cao", time: "1 ngày trước", tone: "blue" as const },
];

export const featuredDocs = [
  { id: "f1", title: "Slide - Lập trình Web nâng cao", meta: "PDF • 2.5 MB" },
  { id: "f2", title: "Tài liệu hướng dẫn Python", meta: "PDF • 1.8 MB" },
  { id: "f3", title: "Cheat sheet SQL", meta: "PDF • 1.2 MB" },
  { id: "f4", title: "Hướng dẫn làm bài tập", meta: "DOCX • 1.1 MB" },
];

/* ---------- Bài tập ---------- */
export const studentAssignments: StudentAssignment[] = [
  {
    id: "sa3", title: "Bài tập 3: API với Node.js", classCode: "WEB301", courseName: "Lập trình Web nâng cao",
    filesLabel: "1 file", due: "28/09/2026 23:59", points: 100, status: "overdue", tone: "red",
    description: ["Xây dựng REST API quản lý sản phẩm bằng Express.js.", "1. Thiết kế schema với 5+ trường.", "2. CRUD đầy đủ + validate.", "3. Viết README hướng dẫn chạy."],
    guide: ["Cài đặt Node.js LTS và Postman.", "Tạo project với express-generator.", "Test từng endpoint trước khi nộp."],
  },
  {
    id: "sa2", title: "Bài tập 2: JavaScript cơ bản", classCode: "WEB301", courseName: "Lập trình Web nâng cao",
    filesLabel: "1 file", due: "25/09/2026 23:59", points: 100, status: "pending", tone: "purple",
    description: ["Xây dựng một trang web đơn giản sử dụng JavaScript với các yêu cầu sau:", "1. Hiển thị danh sách công việc (To-do list)", "2. Cho phép thêm, xóa, đánh dấu hoàn thành", "3. Lưu dữ liệu vào LocalStorage"],
    guide: ["Ôn lại DOM, event và LocalStorage.", "Chia nhỏ tính năng rồi code từng phần.", "Kiểm tra trên Chrome trước khi nén file."],
    submittedAt: "20/09/2026 21:15", fileName: "bt2_javascript.zip", fileSize: "2.4 MB",
  },
  {
    id: "sa1", title: "Bài tập 1: HTML & CSS", classCode: "WEB301", courseName: "Lập trình Web nâng cao",
    filesLabel: "1 file", due: "20/09/2026 23:59", points: 100, status: "submitted", tone: "blue",
    description: ["Dựng landing page cá nhân bằng HTML & CSS thuần.", "1. Tối thiểu 4 section.", "2. Responsive 2 breakpoint.", "3. Không dùng framework CSS."],
    guide: ["Dùng Flexbox/Grid cho layout.", "Tối ưu ảnh trước khi nộp."],
    submittedAt: "19/09/2026 20:02", fileName: "bt1_html_css.zip", fileSize: "1.8 MB",
  },
  {
    id: "sa4", title: "Bài tập lớn: Xây dựng website cá nhân", classCode: "PY101", courseName: "Lập trình Python cơ bản",
    filesLabel: "2 file", due: "05/10/2026 23:59", points: 100, status: "pending", tone: "orange",
    description: ["Xây dựng website portfolio với Flask.", "1. Tối thiểu 3 route.", "2. Dùng template Jinja.", "3. Deploy demo online."],
    guide: ["Học virtualenv và Flask cơ bản.", "Chuẩn bị slide thuyết trình 5 phút."],
  },
  {
    id: "sa5", title: "Bài tập 4: Cấu trúc dữ liệu", classCode: "DB201", courseName: "Cơ sở dữ liệu",
    filesLabel: "1 file", due: "03/10/2026 23:59", points: 100, status: "pending", tone: "purple",
    description: ["Vẽ ERD cho hệ thống quản lý thư viện.", "1. Ít nhất 6 thực thể.", "2. Chuẩn hóa đến 3NF."],
    guide: ["Dùng draw.io vẽ ERD.", "Ghi chú ràng buộc khóa ngoại."],
  },
  {
    id: "sa6", title: "Bài tập thực hành SQL", classCode: "DB201", courseName: "Cơ sở dữ liệu",
    filesLabel: "1 file", due: "15/09/2026 23:59", points: 100, status: "submitted", tone: "green",
    description: ["Viết 20 câu truy vấn SQL theo dataset mẫu."],
    guide: ["Ôn JOIN và GROUP BY."],
    submittedAt: "14/09/2026 22:40", fileName: "bt_sql.sql", fileSize: "36 KB",
  },
  {
    id: "sa7", title: "Bài tập: Phân tích yêu cầu hệ thống", classCode: "SE102", courseName: "Phân tích và thiết kế hệ thống",
    filesLabel: "1 file", due: "10/09/2026 23:59", points: 100, status: "overdue", tone: "red",
    description: ["Viết tài liệu đặc tả yêu cầu cho app đặt xe."],
    guide: ["Vẽ use-case diagram."],
  },
  {
    id: "sa8", title: "Bài tập 5: Fetch API & Async", classCode: "WEB301", courseName: "Lập trình Web nâng cao",
    filesLabel: "1 file", due: "08/10/2026 23:59", points: 100, status: "pending", tone: "blue",
    description: ["Gọi public API hiển thị danh sách phim.", "1. Dùng async/await.", "2. Xử lý loading + error."],
    guide: ["Đọc docs của API trước.", "Không commit API key."],
  },
  {
    id: "sa9", title: "Bài tập 6: React components", classCode: "WEB301", courseName: "Lập trình Web nâng cao",
    filesLabel: "1 file", due: "12/10/2026 23:59", points: 100, status: "pending", tone: "purple",
    description: ["Tách trang To-do list thành components React."],
    guide: ["Mỗi component một file.", "Dùng props + state đúng chỗ."],
  },
  {
    id: "sa10", title: "Bài tập 2: OOP Python", classCode: "PY101", courseName: "Lập trình Python cơ bản",
    filesLabel: "1 file", due: "18/09/2026 23:59", points: 100, status: "submitted", tone: "orange",
    description: ["Cài đặt lớp Student/Course/Grade."],
    guide: ["Viết docstring đầy đủ."],
    submittedAt: "17/09/2026 19:11", fileName: "bt2_oop.py", fileSize: "18 KB",
  },
  {
    id: "sa11", title: "Bài tập 3: Pandas cơ bản", classCode: "PY101", courseName: "Lập trình Python cơ bản",
    filesLabel: "1 file", due: "22/09/2026 23:59", points: 100, status: "submitted", tone: "green",
    description: ["Phân tích dataset điểm thi với pandas."],
    guide: ["Dùng Jupyter notebook."],
    submittedAt: "21/09/2026 21:50", fileName: "bt3_pandas.ipynb", fileSize: "240 KB",
  },
  {
    id: "sa12", title: "Quiz thực hành: Normalization", classCode: "DB201", courseName: "Cơ sở dữ liệu",
    filesLabel: "1 file", due: "20/09/2026 23:59", points: 100, status: "submitted", tone: "blue",
    description: ["Chuẩn hóa 5 lược đồ quan hệ."],
    guide: ["Chụp màn hình kết quả."],
    submittedAt: "19/09/2026 18:26", fileName: "bt_normalize.pdf", fileSize: "900 KB",
  },
  {
    id: "sa13", title: "Bài tập 7: Next.js routing", classCode: "WEB301", courseName: "Lập trình Web nâng cao",
    filesLabel: "1 file", due: "15/10/2026 23:59", points: 100, status: "submitted", tone: "red",
    description: ["Xây dựng blog đa trang với App Router."],
    guide: ["Dùng dynamic routes."],
    submittedAt: "20/09/2026 18:37", fileName: "bt7_nextjs.zip", fileSize: "3.1 MB",
  },
  {
    id: "sa14", title: "Bài tập 4: Closure & Scope", classCode: "WEB301", courseName: "Lập trình Web nâng cao",
    filesLabel: "1 file", due: "16/09/2026 23:59", points: 100, status: "submitted", tone: "purple",
    description: ["Giải 10 bài closure JS."],
    guide: ["Chạy thử từng ví dụ."],
    submittedAt: "15/09/2026 23:01", fileName: "bt4_closure.zip", fileSize: "120 KB",
  },
  {
    id: "sa15", title: "Bài tập nhóm: ERD thư viện", classCode: "DB201", courseName: "Cơ sở dữ liệu",
    filesLabel: "2 file", due: "12/09/2026 23:59", points: 100, status: "submitted", tone: "orange",
    description: ["Thiết kế CSDL thư viện theo nhóm 3."],
    guide: ["Phân công rõ vai trò."],
    submittedAt: "11/09/2026 20:44", fileName: "nhom4_erd.pdf", fileSize: "1.1 MB",
  },
];

export const assignmentComments: AssignmentComment[] = [
  { id: "c1", author: "Trần Minh Anh", time: "3 giờ trước", text: "Mọi người ơi phần LocalStorage lưu mảng object thì JSON.stringify đúng không?" },
  { id: "c2", author: "Nguyễn Văn A (GV)", time: "2 giờ trước", text: "Đúng rồi em, nhớ JSON.parse khi đọc ra và try/catch phòng dữ liệu lỗi nhé." },
  { id: "c3", author: "Lê Hoàng Bảo", time: "1 giờ trước", text: "Em nộp file .zip gồm cả thư mục node_modules có sao không thầy?" },
];

/* ---------- Kiểm tra ---------- */
export const jsSampleQuestions = [
  { id: "q1", question: "Từ khóa nào dùng để khai báo biến không thể gán lại?", options: ["var", "let", "const", "static"], answer: 2 },
  { id: "q2", question: "JSON.parse dùng để làm gì?", options: ["Chuyển object thành chuỗi", "Chuyển chuỗi JSON thành object", "Nén file JS", "Mã hóa mật khẩu"], answer: 1 },
  { id: "q3", question: "Phương thức nào thêm phần tử vào cuối mảng?", options: ["shift()", "unshift()", "push()", "pop()"], answer: 2 },
  { id: "q4", question: "localStorage lưu được kiểu dữ liệu nào trực tiếp?", options: ["Object", "Chuỗi", "Hàm", "Symbol"], answer: 1 },
  { id: "q5", question: "Kết quả của typeof [] là gì?", options: ["array", "object", "list", "undefined"], answer: 1 },
];

export const studentQuizzes: StudentQuiz[] = [
  { id: "sq1", title: "Kiểm tra 2: HTML & CSS", classCode: "WEB301", courseName: "Lập trình Web nâng cao", datetime: "26/09/2026 08:00 - 09:00", questions: 30, minutes: 60, points: 100, status: "done", score: 8.5, tags: ["HTML", "CSS", "Responsive"] },
  { id: "sq2", title: "Kiểm tra 1: JavaScript cơ bản", classCode: "WEB301", courseName: "Lập trình Web nâng cao", datetime: "20/09/2026 08:00 - 09:00", questions: 30, minutes: 60, points: 100, status: "doing", tags: ["Biến và kiểu dữ liệu", "Hàm", "DOM", "Xử lý sự kiện"], sample: jsSampleQuestions },
  { id: "sq3", title: "Kiểm tra 1: Python cơ bản", classCode: "PY101", courseName: "Lập trình Python cơ bản", datetime: "30/09/2026 08:00 - 09:00", questions: 25, minutes: 45, points: 100, status: "todo", tags: ["Syntax", "Hàm", "OOP"] },
  { id: "sq4", title: "Kiểm tra giữa kỳ: Cơ sở dữ liệu", classCode: "DB201", courseName: "Cơ sở dữ liệu", datetime: "15/10/2026 13:00 - 14:30", questions: 40, minutes: 90, points: 100, status: "overdue", tags: ["ERD", "SQL", "Chuẩn hóa"] },
  { id: "sq5", title: "Kiểm tra 3: JavaScript nâng cao", classCode: "WEB301", courseName: "Lập trình Web nâng cao", datetime: "05/10/2026 08:00 - 09:00", questions: 30, minutes: 60, points: 100, status: "done", score: 8.0, tags: ["Async", "Fetch API"] },
  { id: "sq6", title: "Kiểm tra 2: SQL nâng cao", classCode: "DB201", courseName: "Cơ sở dữ liệu", datetime: "10/10/2026 08:00 - 09:00", questions: 30, minutes: 60, points: 100, status: "done", score: 7.5, tags: ["JOIN", "Subquery"] },
  { id: "sq7", title: "Kiểm tra 1: HTML & CSS", classCode: "WEB301", courseName: "Lập trình Web nâng cao", datetime: "12/09/2026 08:00 - 09:00", questions: 30, minutes: 60, points: 100, status: "done", score: 7.5, tags: ["HTML", "CSS"] },
  { id: "sq8", title: "Kiểm tra 2: Python OOP", classCode: "PY101", courseName: "Lập trình Python cơ bản", datetime: "14/09/2026 08:00 - 09:00", questions: 25, minutes: 45, points: 100, status: "done", score: 9.0, tags: ["Class", "Kế thừa"] },
  { id: "sq9", title: "Kiểm tra 3: React cơ bản", classCode: "WEB301", courseName: "Lập trình Web nâng cao", datetime: "18/09/2026 08:00 - 09:00", questions: 20, minutes: 40, points: 100, status: "done", score: 8.0, tags: ["Component", "Props"] },
  { id: "sq10", title: "Kiểm tra 1: ERD", classCode: "DB201", courseName: "Cơ sở dữ liệu", datetime: "08/09/2026 08:00 - 09:00", questions: 20, minutes: 40, points: 100, status: "done", score: 7.0, tags: ["ERD"] },
  { id: "sq11", title: "Kiểm tra cuối kỳ: Web nâng cao", classCode: "WEB301", courseName: "Lập trình Web nâng cao", datetime: "20/12/2026 08:00 - 10:00", questions: 50, minutes: 120, points: 100, status: "todo", tags: ["Tổng hợp"] },
  { id: "sq12", title: "Kiểm tra 2: Normalization", classCode: "DB201", courseName: "Cơ sở dữ liệu", datetime: "05/09/2026 08:00 - 09:00", questions: 20, minutes: 40, points: 100, status: "overdue", tags: ["1NF", "2NF", "3NF"] },
];

/* ---------- Sổ điểm ---------- */
export const gradeRows: GradeRow[] = [
  {
    code: "WEB301", name: "Lập trình Web nâng cao", teacher: "GV: Nguyễn Văn A", credits: 3,
    midterm: 8.0, final: 8.5, total: 8.3, result: "pass", icon: "💻",
    detail: [
      { label: "Bài tập", ratio: "20%", score: 8.0, max: 10, note: "4/5 bài" },
      { label: "Kiểm tra trắc nghiệm", ratio: "10%", score: 9.0, max: 10, note: "Trung bình 3 bài" },
      { label: "Dự án nhóm", ratio: "10%", score: 7.5, max: 10, note: "Website bán hàng" },
      { label: "Thi cuối kỳ", ratio: "60%", score: 8.5, max: 10, note: "Thi viết" },
    ],
  },
  {
    code: "PY101", name: "Python cơ bản", teacher: "GV: Trần Thị B", credits: 3,
    midterm: 9.0, final: 9.0, total: 9.0, result: "pass", icon: "🐍",
    detail: [
      { label: "Bài tập", ratio: "20%", score: 9.0, max: 10, note: "5/5 bài" },
      { label: "Kiểm tra trắc nghiệm", ratio: "10%", score: 9.5, max: 10, note: "Trung bình 2 bài" },
      { label: "Dự án nhóm", ratio: "10%", score: 8.5, max: 10, note: "App quản lý" },
      { label: "Thi cuối kỳ", ratio: "60%", score: 9.0, max: 10, note: "Thi viết" },
    ],
  },
  {
    code: "DB201", name: "Cơ sở dữ liệu", teacher: "GV: Lê Minh C", credits: 3,
    midterm: 7.5, final: 6.8, total: 7.1, result: "pass", icon: "🗄️",
    detail: [
      { label: "Bài tập", ratio: "20%", score: 7.0, max: 10, note: "7/8 bài" },
      { label: "Kiểm tra trắc nghiệm", ratio: "10%", score: 8.0, max: 10, note: "Trung bình 4 bài" },
      { label: "Dự án nhóm", ratio: "10%", score: 7.5, max: 10, note: "ERD thư viện" },
      { label: "Thi cuối kỳ", ratio: "60%", score: 6.8, max: 10, note: "Thi viết" },
    ],
  },
  {
    code: "DSA201", name: "Cấu trúc dữ liệu và giải thuật", teacher: "GV: Phạm Gia D", credits: 3,
    midterm: 6.0, final: 6.5, total: 6.3, result: "pass", icon: "📊",
    detail: [
      { label: "Bài tập", ratio: "20%", score: 6.0, max: 10, note: "3/5 bài" },
      { label: "Kiểm tra trắc nghiệm", ratio: "10%", score: 6.5, max: 10, note: "Trung bình 2 bài" },
      { label: "Dự án nhóm", ratio: "10%", score: 6.0, max: 10, note: "Visualize sort" },
      { label: "Thi cuối kỳ", ratio: "60%", score: 6.5, max: 10, note: "Thi viết" },
    ],
  },
  {
    code: "UI201", name: "Thiết kế giao diện Web", teacher: "GV: Hoàng Thị E", credits: 2,
    midterm: 8.5, final: 8.0, total: 8.2, result: "pass", icon: "🎨",
    detail: [
      { label: "Bài tập", ratio: "30%", score: 8.5, max: 10, note: "4/4 bài" },
      { label: "Kiểm tra trắc nghiệm", ratio: "10%", score: 8.0, max: 10, note: "1 bài" },
      { label: "Đồ án", ratio: "60%", score: 8.0, max: 10, note: "Figma prototype" },
    ],
  },
  {
    code: "BE301", name: "Phát triển API với Node.js", teacher: "GV: Nguyễn Văn F", credits: 3,
    midterm: null, final: null, total: null, result: "ongoing", icon: "⬢",
    detail: [
      { label: "Bài tập", ratio: "20%", score: null, max: 10, note: "0/4 bài" },
      { label: "Kiểm tra trắc nghiệm", ratio: "10%", score: null, max: 10, note: "Chưa có" },
      { label: "Dự án nhóm", ratio: "10%", score: null, max: 10, note: "Chưa có" },
      { label: "Thi cuối kỳ", ratio: "60%", score: null, max: 10, note: "Chưa thi" },
    ],
  },
];

/* ---------- Thông báo ---------- */
export const studentInbox: StudentInboxItem[] = [
  { id: "si1", title: "Hạn nộp bài tập 2: JavaScript cơ bản", desc: "Bài tập 2 của môn Lập trình Web nâng cao sẽ hết hạn nộp vào 23:59 ngày 25/09/2026. Vui lòng nộp bài đúng hạn để tránh bị trừ điểm.", timeAgo: "2 giờ trước", unread: true, important: true, category: "assignment", tone: "red" },
  { id: "si2", title: "Lịch học tuần này đã được cập nhật", desc: "Giảng viên đã cập nhật lịch học tuần 26/09 - 02/10/2026 cho lớp WEB301.", timeAgo: "5 giờ trước", unread: true, important: false, category: "schedule", tone: "blue" },
  { id: "si3", title: "Điểm kiểm tra 1: HTML & CSS đã được công bố", desc: "Giảng viên Nguyễn Văn A đã công bố điểm kiểm tra 1. Bạn có thể xem chi tiết trong mục Sổ điểm.", timeAgo: "1 ngày trước", unread: true, important: false, category: "grade", tone: "green" },
  { id: "si4", title: "Thông báo từ giảng viên", desc: "Buổi học ngày 28/09/2026 sẽ chuyển sang hình thức trực tuyến (Google Meet). Xem thêm thông tin trong mục Lịch.", timeAgo: "1 ngày trước", unread: true, important: false, category: "class", tone: "purple" },
  { id: "si5", title: "Tài liệu mới: Slide - Responsive Web Design", desc: "Giảng viên đã đăng tài liệu mới cho bài học Buổi 4: Responsive Web Design.", timeAgo: "2 ngày trước", unread: true, important: false, category: "assignment", tone: "orange" },
  { id: "si6", title: "Kết quả bài tập 1 đã được chấm", desc: "Giảng viên đã chấm bài tập 1: HTML & CSS. Bạn có thể xem điểm và nhận xét chi tiết.", timeAgo: "3 ngày trước", unread: true, important: false, category: "grade", tone: "red" },
  { id: "si7", title: "Bảo trì hệ thống", desc: "Hệ thống sẽ được bảo trì vào lúc 02:00 - 04:00 ngày 30/09/2026. Trong thời gian này, bạn có thể gặp khó khăn khi truy cập.", timeAgo: "3 ngày trước", unread: true, important: false, category: "system", tone: "blue" },
  { id: "si8", title: "Có lớp học mới được thêm", desc: "Bạn đã được thêm vào lớp PY101 - Python cơ bản do giảng viên Trần Thị B phụ trách.", timeAgo: "4 ngày trước", unread: true, important: false, category: "class", tone: "purple" },
  { id: "si9", title: "Nhắc nhở: Buổi kiểm tra 2", desc: "Buổi kiểm tra 2: JavaScript cơ bản sẽ diễn ra vào 26/09/2026 (08:00 - 09:00). Hãy ôn tập và chuẩn bị đầy đủ.", timeAgo: "5 ngày trước", unread: false, important: true, category: "schedule", tone: "green" },
  { id: "si10", title: "Chúc mừng!", desc: "Bạn đã hoàn thành 50% tiến độ học tập của môn Cơ sở dữ liệu.", timeAgo: "1 tuần trước", unread: false, important: false, category: "class", tone: "yellow" },
  { id: "si11", title: "Buổi kiểm tra 2: JavaScript cơ bản", desc: "Lịch kiểm tra 2 môn Web nâng cao đã được chốt: 26/09/2026 (08:00).", timeAgo: "5 ngày trước", unread: false, important: false, category: "class", tone: "red" },
  { id: "si12", title: "Tài liệu ôn tập giữa kỳ", desc: "Đề cương ôn tập giữa kỳ môn Python đã được đăng tải.", timeAgo: "6 ngày trước", unread: false, important: false, category: "class", tone: "orange" },
];

/* ---------- Lịch học (tuần 22-28/09/2026) ---------- */
export const weekEvents: WeekEvent[] = [
  { id: "w1", title: "Lập trình Web nâng cao", type: "class", date: "2026-09-22", start: "08:00", end: "09:30", room: "A1-301", course: "WEB301" },
  { id: "w2", title: "Cơ sở dữ liệu", type: "class", date: "2026-09-22", start: "10:00", end: "11:30", room: "B2-201", course: "DB201" },
  { id: "w3", title: "Python cơ bản", type: "class", date: "2026-09-23", start: "08:00", end: "09:30", room: "A1-302", course: "PY101" },
  { id: "w4", title: "Thiết kế giao diện Web", type: "class", date: "2026-09-23", start: "13:00", end: "14:30", room: "C3-101", course: "UI201" },
  { id: "w5", title: "Cấu trúc dữ liệu và giải thuật", type: "class", date: "2026-09-23", start: "15:00", end: "16:30", room: "B1-202", course: "DSA201" },
  { id: "w6", title: "Lập trình Web nâng cao", type: "class", date: "2026-09-24", start: "08:00", end: "09:30", room: "A1-301", course: "WEB301" },
  { id: "w7", title: "Kiểm tra 1: HTML & CSS", type: "quiz", date: "2026-09-24", start: "10:00", end: "11:00", room: "Phòng C1-401", course: "WEB301" },
  { id: "w8", title: "Cơ sở dữ liệu", type: "class", date: "2026-09-24", start: "14:00", end: "15:30", room: "B2-201", course: "DB201" },
  { id: "w9", title: "Python cơ bản", type: "class", date: "2026-09-25", start: "08:00", end: "09:30", room: "A1-302", course: "PY101" },
  { id: "w10", title: "Thiết kế giao diện Web", type: "class", date: "2026-09-25", start: "13:00", end: "14:30", room: "C3-101", course: "UI201" },
  { id: "w11", title: "Phát triển API với Node.js", type: "event", date: "2026-09-25", start: "16:00", end: "17:30", room: "A2-303", course: "WEB302" },
  { id: "w12", title: "Cơ sở dữ liệu", type: "class", date: "2026-09-26", start: "10:00", end: "11:30", room: "B2-201", course: "DB201" },
  { id: "w13", title: "Lập trình Web nâng cao", type: "class", date: "2026-09-26", start: "15:00", end: "16:30", room: "A1-301", course: "WEB301" },
  { id: "w14", title: "Hạn nộp bài: Bài tập 2", type: "assignment", date: "2026-09-25", start: "23:59", end: "23:59", room: "", course: "WEB301" },
  { id: "w15", title: "Kiểm tra 2: HTML & CSS", type: "quiz", date: "2026-09-26", start: "08:00", end: "09:00", room: "Phòng thi trực tuyến", course: "WEB301" },
];
