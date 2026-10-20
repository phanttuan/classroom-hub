import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/lib/context/sidebar-context";

export const metadata: Metadata = {
  title: "EduHub | Giáo viên",
  description: "Tổng quan giảng dạy: khóa học, bài tập, kiểm tra, lịch và thông báo.",
};

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar_collapsed")?.value === "true";

  // Nền nằm ở layout (giữ nguyên khi chuyển trang) → không lộ nền trắng của body trong lúc đổi trang
  return (
    <SidebarProvider defaultCollapsed={defaultCollapsed}>
      <div className="min-h-screen bg-[#F6F8FB]">{children}</div>
    </SidebarProvider>
  );
}

