/**
 * Mock cho trang Lớp học (Image 1).
 * Dùng chung type TeacherClass — bổ sung description / counts / dateRange.
 */
import type { TeacherClass } from "@/lib/types/teacher";

export const classPageClasses: TeacherClass[] = [
  {
    id: "cls-web301",
    code: "WEB301",
    name: "Lập trình Web nâng cao",
    studentCount: 42,
    courseCount: 3,
    updatedAt: "12/09/2026",
    status: "active",
    coverGradient: "from-amber-100 via-orange-100 to-stone-300",
    coverEmoji: "💻",
    description:
      "Khóa học giúp sinh viên nắm vững kiến thức về phát triển web hiện đại với Next.js và các công nghệ...",
    assignmentCount: 3,
    quizCount: 2,
    dateRange: "12/09/2026 - 20/12/2026",
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
    description:
      "Khóa học giới thiệu lập trình Python từ cơ bản đến ứng dụng với nhiều bài thực hành.",
    assignmentCount: 4,
    quizCount: 3,
    dateRange: "10/09/2026 - 15/12/2026",
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
    description:
      "Khóa học cung cấp kiến thức về cấu trúc dữ liệu, giải thuật và ứng dụng trong lập trình.",
    assignmentCount: 2,
    quizCount: 1,
    dateRange: "05/09/2026 - 05/11/2026",
  },
];

export type ClassTab = "all" | "active" | "closed" | "archived";

/** Avatar demo cho cụm "+39" — dùng pravatar, fallback initials nếu offline */
export const demoAvatars = [
  "https://i.pravatar.cc/64?img=47",
  "https://i.pravatar.cc/64?img=12",
  "https://i.pravatar.cc/64?img=32",
  "https://i.pravatar.cc/64?img=56",
];
