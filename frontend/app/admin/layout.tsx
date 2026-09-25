import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EduLearn | Quản trị viên",
  description: "Tổng quan hệ thống, quản lý người dùng và giám sát lớp học.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
