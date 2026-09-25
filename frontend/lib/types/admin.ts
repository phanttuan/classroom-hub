/**
 * Contracts cho Admin (Trang chủ / Quản lý người dùng / Giám sát lớp học).
 * Mock data nằm ở `lib/mock/admin.ts`. Sau này thay bằng API thật
 * thì chỉ cần giữ đúng contract này.
 */

export interface AdminProfile {
  id: string;
  fullName: string;
  role: string;
  avatarUrl: string;
}

export type AdminUserRole = "student" | "teacher";
export type AdminUserStatus = "active" | "locked";

export interface EnrolledClass {
  code: string;
  name: string;
  teacherName: string;
  iconTone: "blue" | "green" | "purple" | "orange" | "red";
}

export interface AdminUser {
  id: string;
  fullName: string;
  /** pravatar img id để render avatar demo */
  avatarImg: number;
  code: string; // MSSV / Mã GV
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string; // dd/MM/yyyy
  createdTime?: string; // "08:30"
  birthDate?: string;
  gender?: string;
  phone?: string;
  enrolled?: EnrolledClass[];
  activity?: { text: string; time: string }[];
}

export type AdminClassStatus = "active" | "paused" | "inactive";

export interface AdminClassMember {
  id: string;
  fullName: string;
  code: string;
  avatarImg: number;
  joinedAt: string; // dd/MM/yyyy
}

export interface AdminClass {
  id: string;
  name: string;
  code: string;
  teacherName: string;
  teacherAvatarImg: number;
  memberCount: number;
  status: AdminClassStatus;
  createdAt: string; // dd/MM/yyyy
  createdTime?: string;
  description?: string;
  recentMembers?: AdminClassMember[];
  iconTone: "blue" | "green" | "purple" | "orange" | "red" | "teal";
}

export interface FlaggedAccount {
  id: string;
  userId: string;
  fullName: string;
  avatarImg: number;
  role: AdminUserRole;
  issue: string;
  timeAgo: string;
}

export type ActivityKind = "register" | "class-created" | "locked" | "teacher-create";

export interface SystemActivity {
  id: string;
  kind: ActivityKind;
  text: string;
  timeAgo: string;
}

export interface AdminStat {
  id: string;
  label: string;
  value: string | number;
  delta: string;
  deltaUp: boolean;
  deltaNote: string;
  tone: "blue" | "green" | "purple" | "orange" | "red";
  icon: "students" | "teachers" | "classes" | "users" | "inactive";
}

export interface AdminSidebarItem {
  id: string;
  label: string;
  href: string;
  icon: "home" | "users" | "classes";
}
