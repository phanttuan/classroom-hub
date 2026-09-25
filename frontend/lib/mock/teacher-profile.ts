/**
 * Mock cho trang Hồ sơ cá nhân.
 */
import type { LoginSession, TeacherProfileFull, WorkInfo } from "@/lib/types/teacher";

export const profileFull: TeacherProfileFull = {
  fullName: "Nguyễn Văn A",
  title: "Giáo viên",
  email: "nguyenvana@edulearn.edu.vn",
  phone: "0901 234 567",
  birthDate: "15/05/1995",
  gender: "Nam",
  address: "TP. Hồ Chí Minh, Việt Nam",
  avatarUrl: "/images/teacher.webp",
  department: "Công nghệ thông tin",
  subjects: ["Lập trình Web", "Cơ sở dữ liệu", "Lập trình Java"],
  bio: "Giáo viên bộ môn Công nghệ thông tin. Có kinh nghiệm giảng dạy các môn lập trình web, cơ sở dữ liệu và lập trình Java. Luôn mong muốn mang đến môi trường học tập tích cực cho học sinh.",
};

export const workInfo: WorkInfo = {
  department: "Công nghệ thông tin",
  staffId: "GV001",
  joinDate: "01/09/2024",
  status: "Đang hoạt động",
};

export const profileQuickStats = [
  { id: "classes", label: "Lớp học đang dạy", value: 3 },
  { id: "courses", label: "Khóa học", value: 2 },
  { id: "assignments", label: "Bài tập đã giao", value: 12 },
  { id: "quizzes", label: "Bài kiểm tra đã tạo", value: 8 },
];

export const loginSessions: LoginSession[] = [
  { id: "ss-1", device: "Windows - Chrome", location: "TP. Hồ Chí Minh, Việt Nam", lastActive: "Đang hoạt động", current: true },
  { id: "ss-2", device: "Samsung - Chrome", location: "Hà Nội, Việt Nam", lastActive: "15/09/2026 14:32", current: false },
  { id: "ss-3", device: "Windows - Edge", location: "Đà Nẵng, Việt Nam", lastActive: "12/09/2026 09:15", current: false },
];

export const titleOptions = ["Giáo viên", "Giảng viên", "Trợ giảng", "Giáo sư"];
export const departmentOptions = ["Công nghệ thông tin", "Toán học", "Vật lý", "Ngoại ngữ"];
export const subjectOptions = ["Lập trình Web", "Cơ sở dữ liệu", "Lập trình Java", "Lập trình Python", "AI cơ bản"];
export const genderOptions = ["Nam", "Nữ", "Khác"];
