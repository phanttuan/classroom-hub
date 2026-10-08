"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, EyeOff, ListTree, Plus, X } from "lucide-react";
import type { CourseContentDto } from "@/lib/types/learning-content";
import { fetchCourseContent } from "@/lib/api/learning-content-api";
import { LESSON_TYPE_META } from "@/lib/lesson-types";
import TeacherTopbar from "@/app/teacher/components/TeacherTopbar";
import { NotificationModal } from "@/app/teacher/components/TeacherModals";
import { teacherNotifications } from "@/lib/mock/teacher-dashboard";
import type { TeacherNotification, TeacherProfile } from "@/lib/types/teacher";
import { fetchUserProfile } from "@/lib/api/user-api";

export type CourseRole = "TEACHER" | "STUDENT";

/** Đường dẫn gốc của trang khóa học theo vai trò */
export function coursePathOf(role: CourseRole, courseId: string) {
  return role === "TEACHER" ? `/teacher/content/courses/${courseId}` : `/student/content/courses/${courseId}`;
}

/** Tải nội dung môn học (module → bài học) — dùng chung cho trang khóa học, trang bài học, trang soạn thảo */
export function useCourseContent(courseId: string) {
  const [course, setCourse] = useState<CourseContentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await fetchCourseContent(courseId);
      setCourse(data);
      setError("");
      return data;
    } catch (err) {
      setError((err as Error)?.message || "Không tải được nội dung lớp học");
      return null;
    }
  }, [courseId]);

  useEffect(() => {
    let active = true;
    fetchCourseContent(courseId)
      .then((data) => active && setCourse(data))
      .catch((err) => active && setError((err as Error)?.message || "Không tải được nội dung lớp học"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [courseId]);

  return { course, setCourse, loading, error, reload };
}

/** Hồ sơ người dùng đã tải, giữ giữa các trang trong khóa học (chỉ tồn tại phía client) */
let cachedCourseUser: TeacherProfile | null = null;

function useCurrentUser(role: CourseRole) {
  const fallbackAvatar = role === "TEACHER" ? "/images/teacher.webp" : "/images/student.webp";
  const [currentUser, setCurrentUser] = useState<TeacherProfile>(
    () =>
      cachedCourseUser ?? {
        id: role === "TEACHER" ? "gv-001" : "st-001",
        fullName: role === "TEACHER" ? "Giảng viên" : "Học sinh",
        role: role === "TEACHER" ? "Giáo viên" : "Học sinh",
        avatarUrl: fallbackAvatar,
      }
  );
  useEffect(() => {
    if (currentUser.id !== "gv-001" && currentUser.id !== "st-001") cachedCourseUser = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const roleLabel = (r?: string) => (r === "TEACHER" ? "Giáo viên" : r === "ADMIN" ? "Quản trị viên" : "Học sinh");
    fetchUserProfile()
      .then((data) => {
        if (data) {
          setCurrentUser({
            id: data.id,
            fullName: data.fullName,
            role: roleLabel(data.role),
            avatarUrl: data.avatarUrl || fallbackAvatar,
          });
        }
      })
      .catch(() => {});
  }, [fallbackAvatar]);

  return currentUser;
}

interface CourseShellProps {
  course: CourseContentDto | null;
  role: CourseRole;
  /** Link logo trên header */
  backHref: string;
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  actionRight?: React.ReactNode;
  activeModuleId?: string;
  activeLessonId?: string;
  /** Trang khóa học truyền vào để cuộn tới topic; trang khác mặc định điều hướng về trang khóa học */
  onModuleClick?: (moduleId: string) => void;
  /** Hiện nút "Thêm topic mới" trong mục lục (chỉ trang khóa học) */
  onAddTopic?: () => void;
  children: React.ReactNode;
}

/**
 * Khung dùng chung cho mọi trang trong khóa học:
 * header (TeacherTopbar) + mục lục khóa học trượt từ bên trái (giống course index của Moodle).
 */
export default function CourseShell({
  course,
  role,
  backHref,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm trong lớp học...",
  actionRight,
  activeModuleId,
  activeLessonId,
  onModuleClick,
  onAddTopic,
  children,
}: CourseShellProps) {
  const router = useRouter();
  const currentUser = useCurrentUser(role);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState<TeacherNotification | null | undefined>(undefined);
  const [localSearch, setLocalSearch] = useState("");

  const coursePath = course ? coursePathOf(role, course.id) : "";

  const goToModule = (moduleId: string) => {
    if (onModuleClick) onModuleClick(moduleId);
    else router.push(`${coursePath}#module-section-${moduleId}`);
    if (window.innerWidth < 1024) setDrawerOpen(false);
  };

  const goToLesson = (moduleId: string, lessonId: string, isLabel: boolean) => {
    setDrawerOpen(false);
    if (isLabel) goToModule(moduleId);
    else router.push(`${coursePath}/lessons/${lessonId}`);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 antialiased font-sans">
      <TeacherTopbar
        profile={currentUser}
        notifications={teacherNotifications}
        searchQuery={searchQuery ?? localSearch}
        onSearchChange={onSearchChange ?? setLocalSearch}
        onOpenNotifications={() => setSelectedNoti(null)}
        placeholder={searchPlaceholder}
        showLogo={true}
        logoHref={backHref}
        actionRight={actionRight}
      />

      {selectedNoti !== undefined && (
        <NotificationModal
          notification={selectedNoti}
          all={teacherNotifications}
          onClose={() => setSelectedNoti(undefined)}
        />
      )}

      {/* Nút tròn mở mục lục */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Mở mục lục lớp học"
        title="Mục lục lớp học"
        className="fixed left-3 top-20 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-md transition-all duration-200 hover:scale-105 hover:border-[#0f6cbf] hover:text-[#0f6cbf] active:scale-95"
      >
        <ListTree className="h-5 w-5" />
      </button>

      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[330px] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex min-w-0 items-center gap-2 text-[15px] font-bold text-slate-800">
            <ListTree className="h-5 w-5 shrink-0 text-[#0f6cbf]" />
            <span className="truncate">{course?.name || "Mục lục lớp học"}</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Đóng"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1.5">
            {course?.modules?.map((m) => {
              const isSelected = activeModuleId === m.id;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => goToModule(m.id)}
                    className={`flex w-full items-start gap-2 rounded-xl p-2.5 text-left text-[13px] font-semibold transition ${
                      isSelected ? "bg-[#0f6cbf] text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    <span className="line-clamp-2 flex-1 leading-snug">{m.title}</span>
                  </button>

                  {m.lessons && m.lessons.length > 0 && (
                    <ul className="ml-5 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                      {m.lessons.map((l) => {
                        const meta = LESSON_TYPE_META[l.type] ?? LESSON_TYPE_META.PAGE;
                        const Icon = meta.icon;
                        const isActive = activeLessonId === l.id;
                        const hidden = l.status !== "PUBLISHED";
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => goToLesson(m.id, l.id, l.type === "LABEL")}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition ${
                                isActive
                                  ? "bg-blue-50 font-semibold text-[#0f6cbf]"
                                  : "text-slate-600 hover:bg-blue-50 hover:text-[#0f6cbf]"
                              } ${hidden ? "opacity-60" : ""}`}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="flex-1 truncate">{l.title}</span>
                              {hidden && <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                              {role === "STUDENT" && l.isCompleted && (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {role === "TEACHER" && onAddTopic && (
          <div className="border-t border-slate-200 p-3">
            <button
              onClick={() => {
                setDrawerOpen(false);
                onAddTopic();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 py-2.5 text-[13px] font-bold text-[#0f6cbf] transition hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" /> Thêm topic mới
            </button>
          </div>
        )}
      </aside>

      <div className="page-enter">{children}</div>
    </div>
  );
}
