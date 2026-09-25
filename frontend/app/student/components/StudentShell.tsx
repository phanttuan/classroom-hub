"use client";

import { useMemo, useState } from "react";
import TeacherTopbar from "../../teacher/components/TeacherTopbar";
import { NotificationModal } from "../../teacher/components/TeacherModals";
import StudentSidebar from "./StudentSidebar";
import { studentInbox, studentProfile } from "@/lib/mock/student";
import type { TeacherNotification } from "@/lib/types/teacher";

/**
 * Shell dùng chung cho mọi trang /student/*.
 * Tái dùng Topbar + Modal của teacher để đồng nhất trải nghiệm.
 */
export default function StudentShell({
  activeId,
  searchPlaceholder = "Tìm kiếm khóa học, bài học, tài liệu...",
  searchValue,
  onSearchChange,
  children,
}: {
  activeId: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState<TeacherNotification | null | undefined>(
    undefined,
  );

  const bellNotifs: TeacherNotification[] = useMemo(
    () =>
      studentInbox.slice(0, 5).map((n) => ({
        id: n.id,
        kind: "announcement" as const,
        title: n.title,
        description: n.desc,
        timeAgo: n.timeAgo,
        unread: n.unread,
      })),
    [],
  );

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-900">
      <StudentSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId={activeId}
      />

      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <TeacherTopbar
          profile={{
            id: "st-001",
            fullName: studentProfile.fullName,
            role: studentProfile.role,
            avatarUrl: studentProfile.avatarUrl,
          }}
          notifications={bellNotifs}
          searchQuery={searchValue}
          onSearchChange={onSearchChange}
          onMenu={() => setSidebarOpen(true)}
          onOpenNotifications={() => setSelectedNoti(null)}
          placeholder={searchPlaceholder}
          menuItems={[
            { label: "Hồ sơ cá nhân", href: "/student/profile" },
            { label: "Đăng xuất", href: "/login" },
          ]}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6">
          {children}
        </main>
      </div>

      {selectedNoti !== undefined && (
        <NotificationModal
          notification={selectedNoti}
          all={bellNotifs}
          onClose={() => setSelectedNoti(undefined)}
        />
      )}
    </div>
  );
}

/** Toast mini dùng chung cho các trang student */
export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-xl">
      {message}
    </div>
  );
}
