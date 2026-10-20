"use client";

import { useEffect, useMemo, useState } from "react";
import TeacherTopbar from "../../teacher/components/TeacherTopbar";
import { NotificationModal } from "../../teacher/components/TeacherModals";
import StudentSidebar from "./StudentSidebar";
import { studentInbox, studentProfile } from "@/lib/mock/student";
import type { TeacherNotification, TeacherProfile } from "@/lib/types/teacher";
import { fetchUserProfile } from "@/lib/api/user-api";
import { useSidebar } from "@/lib/context/sidebar-context";

/**
 * Shell dùng chung cho mọi trang /student/*.
 * Tái dùng Topbar + Modal của teacher để đồng nhất trải nghiệm.
 */
/** Hồ sơ người dùng đã tải, giữ giữa các lần chuyển trang (chỉ tồn tại phía client) */
let cachedStudentProfile: TeacherProfile | null = null;

export default function StudentShell({
  activeId,
  activeHref,
  searchPlaceholder = "Tìm kiếm khóa học, bài học, tài liệu...",
  searchValue,
  onSearchChange,
  userProfile,
  children,
}: {
  activeId: string;
  activeHref?: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  userProfile?: {
    id?: string;
    fullName: string;
    role?: string;
    avatarUrl?: string | null;
  };
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState<TeacherNotification | null | undefined>(
    undefined,
  );
  // Khởi tạo từ hồ sơ đã tải ở trang trước → tên / avatar không nháy về mặc định khi chuyển trang
  const [loadedUser, setLoadedUser] = useState<TeacherProfile | null>(() => cachedStudentProfile);
  useEffect(() => {
    if (loadedUser) cachedStudentProfile = loadedUser;
  }, [loadedUser]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setLoadedUser({
          id: u.id ? String(u.id) : "st-001",
          fullName: u.fullName || studentProfile.fullName,
          role: u.role === "STUDENT" ? "Học sinh" : u.role === "TEACHER" ? "Giáo viên" : "Quản trị viên",
          avatarUrl: u.avatarUrl || studentProfile.avatarUrl,
        });
      }
    } catch {}

    fetchUserProfile()
      .then((data) => {
        if (data) {
          setLoadedUser({
            id: data.id,
            fullName: data.fullName,
            role: data.role === "STUDENT" ? "Học sinh" : data.role === "TEACHER" ? "Giáo viên" : "Quản trị viên",
            avatarUrl: data.avatarUrl || studentProfile.avatarUrl,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setLoadedUser((prev) => ({
          id: detail.id || prev?.id || "st-001",
          fullName: detail.fullName || prev?.fullName || "",
          role: detail.role === "STUDENT" ? "Học sinh" : detail.role === "TEACHER" ? "Giáo viên" : detail.role === "ADMIN" ? "Quản trị viên" : (detail.role || prev?.role || "Học sinh"),
          avatarUrl: detail.avatarUrl || prev?.avatarUrl || studentProfile.avatarUrl,
        }));
      }
    };
    window.addEventListener("user-profile-updated", handleUpdate);
    return () => window.removeEventListener("user-profile-updated", handleUpdate);
  }, []);

  const currentProfile: TeacherProfile = useMemo(() => {
    if (userProfile && userProfile.fullName) {
      return {
        id: userProfile.id || loadedUser?.id || "st-001",
        fullName: userProfile.fullName,
        role: userProfile.role === "STUDENT" ? "Học sinh" : userProfile.role === "TEACHER" ? "Giáo viên" : userProfile.role === "ADMIN" ? "Quản trị viên" : (userProfile.role || loadedUser?.role || "Học sinh"),
        avatarUrl: userProfile.avatarUrl || loadedUser?.avatarUrl || studentProfile.avatarUrl,
      };
    }
    if (loadedUser) {
      return loadedUser;
    }
    return {
      id: "st-001",
      fullName: studentProfile.fullName,
      role: studentProfile.role,
      avatarUrl: studentProfile.avatarUrl,
    };
  }, [userProfile, loadedUser]);

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

  const { collapsed, toggleCollapse } = useSidebar();

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-900">
      <StudentSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId={activeId}
        activeHref={activeHref}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${collapsed ? "lg:pl-[72px]" : "lg:pl-[248px]"}`}>
        <TeacherTopbar
          profile={currentProfile}
          notifications={bellNotifs}
          searchQuery={searchValue}
          onSearchChange={onSearchChange}
          onMenu={() => setSidebarOpen(true)}
          onOpenNotifications={() => setSelectedNoti(null)}
          placeholder={searchPlaceholder}
          menuItems={[
            { label: "Cài đặt", href: "/student/settings" },
            { label: "Đăng xuất", href: "/login" },
          ]}
        />
        <main className="page-enter mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6">
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
