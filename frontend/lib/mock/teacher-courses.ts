/** Mock cho trang Khóa học (Image 2). */
import type { TeacherCourse } from "@/lib/types/teacher";

export const courseList: TeacherCourse[] = [
  {
    id: "course-web-adv",
    title: "Lập trình Web nâng cao",
    classCode: "WEB301",
    description:
      "Khóa học giúp sinh viên nắm vững kiến thức về phát triển web hiện đại với Next.js và các công nghệ mới.",
    moduleCount: 4,
    lessonCount: 12,
    updatedAt: "12/09/2026",
    status: "active",
    coverGradient: "from-amber-100 via-orange-100 to-stone-300",
    coverEmoji: "💻",
  },
  {
    id: "course-py-basic",
    title: "Lập trình Python cơ bản",
    classCode: "PY101",
    description:
      "Khóa học giới thiệu lập trình Python từ cơ bản đến ứng dụng với nhiều bài thực hành.",
    moduleCount: 5,
    lessonCount: 18,
    updatedAt: "10/09/2026",
    status: "active",
    coverGradient: "from-slate-900 via-blue-950 to-slate-800",
    coverEmoji: "🐍",
  },
  {
    id: "course-dsa",
    title: "Cấu trúc dữ liệu và giải thuật",
    classCode: "CS201",
    description:
      "Khóa học cung cấp kiến thức về cấu trúc dữ liệu, giải thuật và ứng dụng trong lập trình.",
    moduleCount: 6,
    lessonCount: 20,
    updatedAt: "05/09/2026",
    status: "active",
    coverGradient: "from-indigo-950 via-blue-900 to-cyan-800",
    coverEmoji: "📊",
  },
  {
    id: "course-ui",
    title: "Thiết kế giao diện người dùng",
    classCode: "WEB301",
    description:
      "Tìm hiểu nguyên lý thiết kế UI/UX, xây dựng giao diện hiện đại với Figma và Tailwind CSS.",
    moduleCount: 3,
    lessonCount: 10,
    updatedAt: "01/09/2026",
    status: "draft",
    coverGradient: "from-stone-200 via-orange-100 to-rose-100",
    coverEmoji: "🎨",
  },
  {
    id: "course-db",
    title: "Hệ quản trị cơ sở dữ liệu",
    classCode: "CS201",
    description:
      "Tổng quan về cơ sở dữ liệu, SQL và thiết kế hệ thống lưu trữ dữ liệu.",
    moduleCount: 4,
    lessonCount: 16,
    updatedAt: "20/08/2026",
    status: "archived",
    coverGradient: "from-blue-950 via-blue-800 to-cyan-700",
    coverEmoji: "🗄️",
  },
  {
    id: "course-cloud",
    title: "Điện toán đám mây",
    classCode: "PY101",
    description:
      "Khóa học giới thiệu các dịch vụ cloud phổ biến và triển khai ứng dụng thực tế.",
    moduleCount: 5,
    lessonCount: 17,
    updatedAt: "28/08/2026",
    status: "active",
    coverGradient: "from-sky-400 via-blue-500 to-blue-700",
    coverEmoji: "☁️",
  },
];

export const courseClassOptions = ["Tất cả lớp học", "WEB301", "PY101", "CS201"];
export const courseStatusOptions = [
  "Tất cả trạng thái",
  "Đang hoạt động",
  "Chưa xuất bản",
  "Đã lưu trữ",
];
export const courseSortOptions = ["Cập nhật mới nhất", "Tên A-Z", "Nhiều bài học nhất"];
