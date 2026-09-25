/**
 * Mock data hardcore cho Teacher Dashboard.
 *
 * VỊ TRÍ CHUYÊN NGHIỆP:
 * - `lib/types/teacher.ts` : contract (kiểu dữ liệu)
 * - `lib/mock/teacher-dashboard.ts` : data giả (file này)
 *
 * Sau này thay bằng API thật: chỉ cần sửa các hàm `fetch...`
 * trong `lib/api/` mà không phải đụng vào UI.
 */

import type {
  DashboardStat,
  PendingAssignment,
  RecentResult,
  ScheduleEvent,
  SidebarItem,
  TeacherClass,
  TeacherNotification,
  TeacherProfile,
} from "@/lib/types/teacher";

export const teacherProfile: TeacherProfile = {
  id: "gv-001",
  fullName: "Nguyễn Văn A",
  role: "Giáo viên",
  avatarUrl: "/images/teacher.webp",
};

export const greetingDateLabel = "Thứ Hai, 15 tháng 9, 2026";

export const dashboardStats: DashboardStat[] = [
  {
    id: "stat-classes",
    label: "Tổng lớp học",
    value: 3,
    tone: "blue",
    icon: "classes",
    detailHref: "/teacher/classes",
  },
  {
    id: "stat-students",
    label: "Tổng sinh viên",
    value: 128,
    tone: "green",
    icon: "students",
    detailHref: "/teacher/students",
  },
  {
    id: "stat-assignments",
    label: "Bài tập đang mở",
    value: 4,
    tone: "purple",
    icon: "assignments",
    detailHref: "/teacher/assignments",
  },
  {
    id: "stat-quizzes",
    label: "Bài kiểm tra đang mở",
    value: 2,
    tone: "orange",
    icon: "quizzes",
    detailHref: "/teacher/quizzes",
  },
];

export const teacherClasses: TeacherClass[] = [
  {
    id: "cls-web301",
    code: "WEB301",
    name: "Lập trình Web nâng cao",
    studentCount: 42,
    courseCount: 3,
    updatedAt: "12/09/2026",
    status: "active",
    coverGradient: "from-amber-100 via-orange-100 to-stone-200",
    coverEmoji: "💻",
  },
  {
    id: "cls-py101",
    code: "PY101",
    name: "Lập trình Python cơ bản",
    studentCount: 56,
    courseCount: 4,
    updatedAt: "10/09/2026",
    status: "active",
    coverGradient: "from-slate-900 via-blue-950 to-slate-800",
    coverEmoji: "🐍",
  },
  {
    id: "cls-cs201",
    code: "CS201",
    name: "Cấu trúc dữ liệu và giải thuật",
    studentCount: 30,
    courseCount: 2,
    updatedAt: "05/09/2026",
    status: "closed",
    coverGradient: "from-sky-950 via-blue-900 to-cyan-800",
    coverEmoji: "📈",
  },
];

export const pendingAssignments: PendingAssignment[] = [
  {
    id: "asg-html-css",
    title: "Bài tập 1: HTML & CSS",
    classCode: "WEB301",
    submitted: 12,
    total: 42,
    tone: "red",
  },
  {
    id: "asg-js-basic",
    title: "Bài tập 2: JavaScript cơ bản",
    classCode: "WEB301",
    submitted: 28,
    total: 42,
    tone: "orange",
  },
  {
    id: "asg-final-web",
    title: "Bài tập cuối kỳ: Xây dựng web",
    classCode: "PY101",
    submitted: 35,
    total: 56,
    tone: "blue",
  },
];

export const recentResults: RecentResult[] = [
  {
    id: "res-html-basics",
    title: "Kiểm tra 1: HTML Basics",
    classCode: "WEB301",
    submissionCount: 42,
    statusLabel: "Đã chấm xong",
    tone: "purple",
  },
  {
    id: "res-python-oop",
    title: "Bài tập 1: Python OOP",
    classCode: "PY101",
    submissionCount: 40,
    statusLabel: "Đã chấm xong",
    tone: "green",
  },
  {
    id: "res-dsa-1",
    title: "Kiểm tra 1: Cấu trúc dữ liệu",
    classCode: "CS201",
    submissionCount: 30,
    statusLabel: "Đã chấm xong",
    tone: "purple",
  },
];

/** Lịch tháng 9/2026 — selected mặc định ngày 15 như ảnh mẫu */
export const calendarMeta = {
  year: 2026,
  month: 9, // 1-indexed
  monthLabel: "Tháng 9, 2026",
  selectedDay: 15,
  /** ngày có dấu chấm cam bên dưới (có sự kiện ngầm) */
  dottedDays: [21, 25, 28, 30],
  weekDays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
};

export const scheduleEvents: ScheduleEvent[] = [
  {
    id: "evt-deadline-py",
    date: "2026-09-15",
    startTime: "09:00",
    endTime: "10:00",
    title: "Hạn nộp bài tập",
    className: "Lập trình Python cơ bản",
    type: "deadline",
  },
  {
    id: "evt-quiz-web",
    date: "2026-09-15",
    startTime: "14:00",
    endTime: "15:00",
    title: "Kiểm tra trắc nghiệm",
    className: "Lập trình Web nâng cao",
    type: "quiz",
  },
  {
    id: "evt-live-dsa",
    date: "2026-09-15",
    startTime: "16:00",
    endTime: "17:00",
    title: "Buổi học trực tuyến",
    className: "Cấu trúc dữ liệu và giải thuật",
    type: "live",
  },
];

export const teacherNotifications: TeacherNotification[] = [
  {
    id: "noti-submission",
    kind: "submission",
    title: "Sinh viên đã nộp bài tập",
    description: 'Có 5 sinh viên đã nộp bài tập "JavaScript cơ bản".',
    timeAgo: "2 giờ trước",
    unread: true,
  },
  {
    id: "noti-web301",
    kind: "announcement",
    title: "Thông báo từ lớp WEB301",
    description: "Lịch học tuần này đã được cập nhật.",
    timeAgo: "5 giờ trước",
  },
  {
    id: "noti-reminder",
    kind: "reminder",
    title: "Nhắc nhở",
    description: 'Hạn nộp bài tập "Python OOP" sắp đến hạn.',
    timeAgo: "1 ngày trước",
  },
];

export const teacherSidebarNav: SidebarItem[] = [
  { id: "home", label: "Tổng quan", icon: "home", href: "/teacher" },
  { id: "classes", label: "Lớp học", icon: "classes", href: "/teacher/classes" },
  {
    id: "content",
    label: "Nội dung học tập",
    icon: "content",
    href: "/teacher/content",
    expandable: true,
    children: [
      { label: "Khóa học", href: "/teacher/content/courses" },
      { label: "Bài học", href: "/teacher/content/lessons" },
      { label: "Tài liệu", href: "/teacher/content/docs" },
    ],
  },
  {
    id: "assignments",
    label: "Bài tập",
    icon: "assignment",
    href: "/teacher/assignments",
  },
  { id: "quizzes", label: "Kiểm tra trắc nghiệm", icon: "quiz", href: "/teacher/quizzes" },
  { id: "grades", label: "Sổ điểm", icon: "gradebook", href: "/teacher/grades" },
  { id: "notifs", label: "Thông báo", icon: "bell", href: "/teacher/notifications" },
  { id: "schedule", label: "Lịch", icon: "calendar", href: "/teacher/schedule" },
  { id: "profile", label: "Hồ sơ cá nhân", icon: "profile", href: "/teacher/profile" },
];
