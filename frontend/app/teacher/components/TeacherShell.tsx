"use client";

import { useState } from "react";
import TeacherSidebar from "./TeacherSidebar";
import TeacherTopbar from "./TeacherTopbar";
import { NotificationModal } from "./TeacherModals";
import { teacherNotifications, teacherProfile } from "@/lib/mock/teacher-dashboard";
import type { TeacherNotification } from "@/lib/types/teacher";

/**
 * Shell dùng chung cho mọi trang /teacher/*.
 * Giữ sidebar + topbar + popup thông báo đồng nhất,
 * trang con chỉ cần truyền nội dung + placeholder search.
 */
export default function TeacherShell({
  activeId,
  activeHref,
  searchPlaceholder = "Tìm kiếm lớp học, bài học, sinh viên...",
  searchValue,
  onSearchChange,
  children,
}: {
  activeId: string;
  activeHref?: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState<TeacherNotification | null | undefined>(
    undefined,
  );

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-900">
      <TeacherSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId={activeId}
        activeHref={activeHref}
      />

      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <TeacherTopbar
          profile={teacherProfile}
          notifications={teacherNotifications}
          searchQuery={searchValue}
          onSearchChange={onSearchChange}
          onMenu={() => setSidebarOpen(true)}
          onOpenNotifications={() => setSelectedNoti(null)}
          placeholder={searchPlaceholder}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6">
          {children}
        </main>
      </div>

      {selectedNoti !== undefined && (
        <NotificationModal
          notification={selectedNoti}
          all={teacherNotifications}
          onClose={() => setSelectedNoti(undefined)}
        />
      )}
      {/* hidden input để giữ placeholder linh hoạt theo từng trang */}
      <span className="hidden" data-search-placeholder={searchPlaceholder} />
    </div>
  );
}

/** Toast mini dùng chung cho các trang con */
export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-xl">
      {message}
    </div>
  );
}
