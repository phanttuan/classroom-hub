import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EduHub | Giáo viên",
  description: "Tổng quan giảng dạy: lớp học, bài tập, kiểm tra, lịch và thông báo.",
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
