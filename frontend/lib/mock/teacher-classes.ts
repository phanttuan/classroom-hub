/**
 * Mock cho trang Lớp học (Image 1).
 * Dùng chung type TeacherClass — bổ sung description / counts / dateRange.
 */
import type { TeacherClass } from "@/lib/types/teacher";

export const classPageClasses: TeacherClass[] = [];

export type ClassTab = "all" | "active" | "closed" | "archived";

/** Avatar demo cho cụm "+39" — dùng pravatar, fallback initials nếu offline */
export const demoAvatars = [
  "https://i.pravatar.cc/64?img=47",
  "https://i.pravatar.cc/64?img=12",
  "https://i.pravatar.cc/64?img=32",
  "https://i.pravatar.cc/64?img=56",
];
