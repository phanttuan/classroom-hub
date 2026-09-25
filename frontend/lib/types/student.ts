/** Contracts cho khu vực học sinh (/student). */

export interface StudentProfile {
  fullName: string;
  role: string;
  avatarUrl: string;
  mssv: string;
  year: string;
  major: string;
  university: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  address: string;
  bio: string;
  hobbies: string[];
  github: string;
  linkedin: string;
}

export type StudentClassStatus = "studying" | "finished" | "upcoming";

export interface StudentClass {
  id: string;
  code: string;
  name: string;
  teacher: string;
  progress: number; // 0-100
  status: StudentClassStatus;
  lessonsDone: number;
  lessonsTotal: number;
  currentScore: number | null; // thang 10
  coverGradient: string;
  coverEmoji: string;
  timeRange?: string;
  scheduleText?: string;
  room?: string;
  assignmentNote?: string;
  quizNote?: string;
}

export interface StudentDeadline {
  id: string;
  kind: "assignment" | "quiz";
  title: string;
  course: string;
  dueLabel: string;
  daysLeft: string;
  tone: "red" | "purple" | "orange";
}

export interface StudentRecentScore {
  id: string;
  title: string;
  code: string;
  score: number;
  date: string;
}

export interface StudentNotif {
  id: string;
  title: string;
  desc: string;
  timeAgo: string;
  unread: boolean;
  tone: "red" | "purple" | "blue" | "orange" | "green";
}

export interface StudentDoc {
  id: string;
  title: string;
  meta: string;
  timeAgo: string;
}

export type ContentItemType = "video" | "doc" | "link" | "other";
export type ContentItemState = "done" | "doing" | "todo";

export interface ContentItem {
  id: string;
  title: string;
  meta: string;
  type: ContentItemType;
  state: ContentItemState;
}

export interface ContentClassGroup {
  classId: string;
  code: string;
  name: string;
  teacher: string;
  status: StudentClassStatus;
  progress: number;
  lessonsDone: number;
  lessonsTotal: number;
  coverGradient: string;
  coverEmoji: string;
  items: ContentItem[];
}

export type StudentAssignmentStatus = "pending" | "submitted" | "overdue";

export interface StudentAssignment {
  id: string;
  title: string;
  classCode: string;
  courseName: string;
  filesLabel: string;
  due: string;
  points: number;
  status: StudentAssignmentStatus;
  tone: "red" | "purple" | "blue" | "orange" | "green";
  description: string[];
  guide: string[];
  submittedAt?: string;
  fileName?: string;
  fileSize?: string;
}

export interface AssignmentComment {
  id: string;
  author: string;
  time: string;
  text: string;
}

export type StudentQuizStatus = "todo" | "doing" | "done" | "overdue";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
}

export interface StudentQuiz {
  id: string;
  title: string;
  classCode: string;
  courseName: string;
  datetime: string;
  questions: number;
  minutes: number;
  points: number;
  status: StudentQuizStatus;
  score?: number;
  tags: string[];
  sample?: QuizQuestion[];
}

export interface GradeRow {
  code: string;
  name: string;
  teacher: string;
  credits: number;
  midterm: number | null;
  final: number | null;
  total: number | null;
  result: "pass" | "ongoing";
  icon: string;
  detail: { label: string; ratio: string; score: number | null; max: number; note: string }[];
}

export interface StudentInboxItem {
  id: string;
  title: string;
  desc: string;
  timeAgo: string;
  unread: boolean;
  important: boolean;
  category: "class" | "assignment" | "schedule" | "grade" | "system";
  tone: "red" | "blue" | "green" | "purple" | "orange" | "yellow";
}

export type WeekEventType = "class" | "assignment" | "quiz" | "event";

export interface WeekEvent {
  id: string;
  title: string;
  type: WeekEventType;
  date: string; // yyyy-MM-dd
  start: string; // "08:00"
  end: string;
  room: string;
  course: string;
}

export interface DayScheduleItem {
  id: string;
  time: string;
  title: string;
  meta: string;
  action: "quiz" | "join" | "none";
  tone: "purple" | "blue" | "orange";
}
