import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/lib/context/sidebar-context";

export const metadata: Metadata = {
  title: "EduLearn | Quản trị viên",
  description: "Tổng quan hệ thống, quản lý người dùng và giám sát lớp học.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar_collapsed")?.value === "true";

  return <SidebarProvider defaultCollapsed={defaultCollapsed}>{children}</SidebarProvider>;
}

