"use client";

import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { NotificationModal } from "../../teacher/components/TeacherModals";
import { adminNotifications } from "@/lib/mock/admin";
import type { TeacherNotification } from "@/lib/types/teacher";

/** Map thông báo admin sang type dùng chung để tái dùng NotificationModal */
const KIND_MAP: Record<string, TeacherNotification["kind"]> = {
  "n-1": "submission",
  "n-2": "reminder",
  "n-3": "announcement",
};

/** Shell dùng chung cho mọi trang /admin/* */
export default function AdminShell({
  activeId,
  searchPlaceholder,
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
      adminNotifications.map((n) => ({
        id: n.id,
        kind: KIND_MAP[n.id] ?? "announcement",
        title: n.title,
        description: n.description,
        timeAgo: n.timeAgo,
        unread: n.unread,
      })),
    [],
  );

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-900">
      <AdminSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId={activeId}
      />
      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <AdminTopbar
          searchQuery={searchValue}
          onSearchChange={onSearchChange}
          onMenu={() => setSidebarOpen(true)}
          onOpenNotifications={() => setSelectedNoti(null)}
          notifications={bellNotifs}
          placeholder={searchPlaceholder}
        />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">
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

/** Toast mini dùng chung */
export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-xl">
      {message}
    </div>
  );
}
