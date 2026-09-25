/**
 * Contracts cho Teacher Dashboard.
 * Đặt riêng ở `lib/types` để UI + mock data + sau này API thật dùng chung.
 */

export type ClassStatus = "active" | "closed" | "archived";

export interface TeacherProfile {
  id: string;
  fullName: string;
  role: string;
  avatarUrl: string;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: number;
  /** key màu để UI map sang tailwind: blue | green | purple | orange */
  tone: "blue" | "green" | "purple" | "orange";
  icon: "classes" | "students" | "assignments" | "quizzes";
  detailHref: string;
}

export interface TeacherClass {
  id: string;
  code: string;
  name: string;
  studentCount: number;
  courseCount: number;
  updatedAt: string; // dd/MM/yyyy
  status: ClassStatus;
  /** gradient thumb khi chưa có ảnh thật */
  coverGradient: string;
  coverEmoji: string;
  /** mở rộng cho trang Lớp học */
  description?: string;
  assignmentCount?: number;
  quizCount?: number;
  dateRange?: string;
}

export interface PendingAssignment {
  id: string;
  title: string;
  classCode: string;
  submitted: number;
  total: number;
  tone: "red" | "orange" | "blue";
}

export interface RecentResult {
  id: string;
  title: string;
  classCode: string;
  submissionCount: number;
  statusLabel: string;
  tone: "purple" | "green";
}

export type ScheduleEventType = "deadline" | "quiz" | "live";

export interface ScheduleEvent {
  id: string;
  date: string; // yyyy-MM-dd
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  title: string;
  className: string;
  type: ScheduleEventType;
}

export type TeacherNotificationKind = "submission" | "announcement" | "reminder";

export interface TeacherNotification {
  id: string;
  kind: TeacherNotificationKind;
  title: string;
  description: string;
  timeAgo: string;
  unread?: boolean;
}

export interface SidebarChild {
  label: string;
  href: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon:
    | "home"
    | "classes"
    | "content"
    | "assignment"
    | "quiz"
    | "gradebook"
    | "bell"
    | "calendar"
    | "profile";
  href: string;
  active?: boolean;
  expandable?: boolean;
  children?: SidebarChild[];
}

/* ================= Nội dung học tập ================= */

export type CourseStatus = "active" | "draft" | "archived";

export interface TeacherCourse {
  id: string;
  title: string;
  classCode: string;
  description: string;
  moduleCount: number;
  lessonCount: number;
  updatedAt: string;
  status: CourseStatus;
  coverGradient: string;
  coverEmoji: string;
}

export type LessonStatus = "published" | "draft";

export interface TeacherLesson {
  id: string;
  no: number;
  title: string;
  description: string;
  duration: string; // "08:20"
  docCount: number;
  quizCount: number;
  status: LessonStatus;
  updatedAt: string;
  thumbGradient: string;
}

export interface LessonModule {
  id: string;
  title: string;
  lessonCount: number;
  lessons: { no: number; title: string; status: LessonStatus }[];
}

export type DocFormat = "PDF" | "MP4" | "DOCX" | "PPTX" | "ZIP" | "PNG";

export interface DocFolder {
  id: string;
  label: string;
  count: number;
  tone: "blue" | "orange" | "green" | "purple";
}

export interface TeacherDocument {
  id: string;
  name: string;
  description: string;
  moduleLabel: string; // "Giới thiệu" | "Bài 1"...
  format: DocFormat;
  size: string;
  uploadedAt: string; // dd/MM/yyyy
  folderId: string;
}

/* ================= Bài tập & Kiểm tra ================= */

export type WorkStatus = "open" | "due-soon" | "closed";

export interface TeacherAssignment {
  id: string;
  title: string;
  description: string;
  classCode: string;
  courseName: string;
  dueDate: string; // "10/09/2026"
  maxScore: number;
  status: WorkStatus;
  submitted: number;
  total: number;
  tone: "red" | "orange" | "blue" | "green" | "purple";
}

export type QuizKind = "midterm" | "final" | "quick";

export interface TeacherQuiz {
  id: string;
  title: string;
  description: string;
  classCode: string;
  courseName: string;
  kind: QuizKind;
  questionCount: number;
  durationMinutes: number;
  openAt: string; // "01/09/2026 08:00"
  dueAt: string; // "10/09/2026 23:59"
  status: WorkStatus;
  done: number;
  total: number;
  tone: "red" | "orange" | "blue" | "green" | "purple";
}

/* ================= Sổ điểm ================= */

export interface GradeItemScore {
  itemId: string;
  itemName: string;
  kind: "assignment" | "quiz";
  score: number | null; // null = chưa chấm
  maxScore: number;
}

export interface GradebookStudent {
  id: string;
  name: string;
  mssv: string;
  classCode: string;
  avatarImg: number; // id ảnh pravatar
  assignmentAvg: number | null; // thang 10
  assignmentTotal: number;
  assignmentMax: number;
  quizAvg: number | null; // thang 10
  quizTotal: number;
  quizMax: number;
  items: GradeItemScore[];
}

export interface GradeWeight {
  assignment: number; // %
  quiz: number; // %
}

/* ================= Thông báo (trang inbox) ================= */

export type InboxCategory = "assignment" | "quiz" | "class" | "system";

export interface InboxNotification {
  id: string;
  title: string;
  description: string;
  classCode: string;
  className: string;
  category: InboxCategory;
  timeAgo: string;
  unread: boolean;
  important: boolean;
  archived: boolean;
  actorName?: string;
  actorMssv?: string;
  actorAvatarImg?: number;
  submittedAt?: string;
  statusLabel?: string;
}

/* ================= Lịch ================= */

export type ScheduleKind = "assignment" | "quiz" | "class" | "other";

export interface ScheduleItem {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  startTime: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  kind: ScheduleKind;
  classCode: string;
  className: string;
  courseName: string;
  location?: string;
}

/* ================= Hồ sơ cá nhân ================= */

export interface TeacherProfileFull {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  birthDate: string; // dd/MM/yyyy
  gender: string;
  address: string;
  avatarUrl: string;
  department: string;
  subjects: string[];
  bio: string;
}

export interface WorkInfo {
  department: string;
  staffId: string;
  joinDate: string;
  status: string;
}

export interface LoginSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}
