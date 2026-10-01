"use client";

import { useEffect, useMemo, useState } from "react";
import TeacherSidebar from "./TeacherSidebar";
import TeacherTopbar from "./TeacherTopbar";
import { NotificationModal } from "./TeacherModals";
import { teacherNotifications, teacherProfile } from "@/lib/mock/teacher-dashboard";
import type { TeacherNotification, TeacherProfile } from "@/lib/types/teacher";
import { fetchUserProfile } from "@/lib/api/user-api";

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
  const [loadedUser, setLoadedUser] = useState<TeacherProfile | null>(null);

  useEffect(() => {
    fetchUserProfile()
      .then((data) => {
        if (data) {
          setLoadedUser({
            id: data.id,
            fullName: data.fullName,
            role: data.role === "TEACHER" ? "Giáo viên" : data.role === "ADMIN" ? "Quản trị viên" : "Học sinh",
            avatarUrl: data.avatarUrl || "/images/teacher.webp",
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
          id: detail.id || prev?.id || "me",
          fullName: detail.fullName || prev?.fullName || "",
          role: detail.role === "TEACHER" ? "Giáo viên" : detail.role === "ADMIN" ? "Quản trị viên" : detail.role === "STUDENT" ? "Học sinh" : (detail.role || prev?.role || "Giáo viên"),
          avatarUrl: detail.avatarUrl || prev?.avatarUrl || "/images/teacher.webp",
        }));
      }
    };
    window.addEventListener("user-profile-updated", handleUpdate);
    return () => window.removeEventListener("user-profile-updated", handleUpdate);
  }, []);

  const currentProfile: TeacherProfile = useMemo(() => {
    if (userProfile) {
      return {
        id: userProfile.id || loadedUser?.id || "me",
        fullName: userProfile.fullName,
        role: userProfile.role === "TEACHER" ? "Giáo viên" : userProfile.role === "ADMIN" ? "Quản trị viên" : userProfile.role === "STUDENT" ? "Học sinh" : (userProfile.role || loadedUser?.role || "Giáo viên"),
        avatarUrl: userProfile.avatarUrl || loadedUser?.avatarUrl || "/images/teacher.webp",
      };
    }
    if (loadedUser) {
      return loadedUser;
    }
    return teacherProfile;
  }, [userProfile, loadedUser]);

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
          profile={currentProfile}
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
