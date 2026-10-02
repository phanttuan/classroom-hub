import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/lib/context/sidebar-context";

export const metadata: Metadata = {
  title: "EduHub | Giáo viên",
  description: "Tổng quan giảng dạy: lớp học, bài tập, kiểm tra, lịch và thông báo.",
};

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar_collapsed")?.value === "true";

  return <SidebarProvider defaultCollapsed={defaultCollapsed}>{children}</SidebarProvider>;
}

