/** Mock cho trang Bài học (Image 3). */
import type { LessonModule, TeacherLesson } from "@/lib/types/teacher";

export const lessonCourseOptions = [
  { id: "WEB301", title: "Lập trình Web nâng cao", code: "WEB301" },
  { id: "PY101", title: "Lập trình Python cơ bản", code: "PY101" },
  { id: "CS201", title: "Cấu trúc dữ liệu và giải thuật", code: "CS201" },
];

export const lessonModules: LessonModule[] = [
  {
    id: "mod-1",
    title: "Module 1: Giới thiệu",
    lessonCount: 3,
    lessons: [
      { no: 1, title: "Bài 1: Tổng quan khóa học", status: "published" },
      { no: 2, title: "Bài 2: Chuẩn bị môi trường", status: "published" },
      { no: 3, title: "Bài 3: Công cụ cần thiết", status: "draft" },
    ],
  },
  {
    id: "mod-2",
    title: "Module 2: HTML & CSS",
    lessonCount: 4,
    lessons: [
      { no: 4, title: "Bài 4: HTML cơ bản", status: "published" },
      { no: 5, title: "Bài 5: CSS cơ bản", status: "published" },
    ],
  },
  {
    id: "mod-3",
    title: "Module 3: JavaScript cơ bản",
    lessonCount: 4,
    lessons: [{ no: 6, title: "Bài 6: Biến và kiểu dữ liệu", status: "draft" }],
  },
  {
    id: "mod-4",
    title: "Module 4: Xây dựng dự án",
    lessonCount: 3,
    lessons: [],
  },
];

export const lessonList: TeacherLesson[] = [
  {
    id: "les-1",
    no: 1,
    title: "Tổng quan khóa học",
    description:
      "Giới thiệu mục tiêu, nội dung và phương pháp học của khóa học Lập trình Web nâng cao.",
    duration: "08:20",
    docCount: 2,
    quizCount: 1,
    status: "published",
    updatedAt: "12/09/2026",
    thumbGradient: "from-stone-300 via-amber-100 to-stone-200",
  },
  {
    id: "les-2",
    no: 2,
    title: "Chuẩn bị môi trường phát triển",
    description: "Hướng dẫn cài đặt Node.js, VS Code và các extension cần thiết.",
    duration: "12:35",
    docCount: 3,
    quizCount: 1,
    status: "published",
    updatedAt: "13/09/2026",
    thumbGradient: "from-slate-900 via-slate-800 to-black",
  },
  {
    id: "les-3",
    no: 3,
    title: "Công cụ và công nghệ sử dụng",
    description: "Giới thiệu chi tiết các công nghệ: Next.js, TypeScript, TailwindCSS,...",
    duration: "15:10",
    docCount: 1,
    quizCount: 1,
    status: "draft",
    updatedAt: "14/09/2026",
    thumbGradient: "from-stone-800 via-stone-700 to-black",
  },
];
