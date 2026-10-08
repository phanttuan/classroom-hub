import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/lib/context/sidebar-context";

export const metadata: Metadata = {
  title: "EduLearn | Học sinh",
  description: "Không gian học tập của học sinh: lớp học, bài tập, kiểm tra, điểm số và lịch học.",
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar_collapsed")?.value === "true";

  // Nền nằm ở layout (giữ nguyên khi chuyển trang) → không lộ nền trắng của body trong lúc đổi trang
  return (
    <SidebarProvider defaultCollapsed={defaultCollapsed}>
      <div className="min-h-screen bg-[#F6F8FB]">{children}</div>
    </SidebarProvider>
  );
}

