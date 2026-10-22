"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, CheckSquare, ChevronDown, ClipboardList, Clock, EyeOff, ListTree, Plus, X, type LucideIcon } from "lucide-react";
import type { CourseContentDto, LessonDto, ModuleDto } from "@/lib/types/learning-content";
import type { AssignmentDto } from "@/lib/types/assignment";
import type { QuizDto } from "@/lib/types/quiz";
import { fetchCourseContent } from "@/lib/api/learning-content-api";
import { fetchCourseAssignments } from "@/lib/api/assignment-api";
import { fetchCourseQuizzes } from "@/lib/api/quiz-api";
import { LESSON_TYPE_META } from "@/lib/lesson-types";
import TeacherTopbar from "@/app/teacher/components/TeacherTopbar";
import { NotificationModal } from "@/app/teacher/components/TeacherModals";
import { teacherNotifications } from "@/lib/mock/teacher-dashboard";
import type { TeacherNotification, TeacherProfile } from "@/lib/types/teacher";
import { fetchUserProfile } from "@/lib/api/user-api";

export type CourseRole = "TEACHER" | "STUDENT";

/** Một mục trong mục lục: bài học / bài tập / đề kiểm tra, sắp theo orderIndex chung của topic */
type IndexItem = {
  key: string;
  kind: "lesson" | "assignment" | "quiz";
  moduleId: string;
  title: string;
  href: string | null;
  icon: LucideIcon;
  iconClass: string;
  order: number;
  hidden: boolean;
  /** Sinh viên: đã hoàn thành / đã nộp / đã làm */
  done: boolean;
  /** Sinh viên: đang làm dở (đề kiểm tra) */
  inProgress?: boolean;
};

/** Gộp bài học + bài tập + đề kiểm tra của một topic theo đúng thứ tự trên trang khóa học */
function buildIndexItems(m: ModuleDto, assignments: AssignmentDto[], quizzes: QuizDto[], coursePath: string): IndexItem[] {
  const lessons: IndexItem[] = (m.lessons ?? []).map((l: LessonDto) => {
    const meta = LESSON_TYPE_META[l.type] ?? LESSON_TYPE_META.PAGE;
    return {
      key: `lesson-${l.id}`,
      kind: "lesson",
      moduleId: m.id,
      title: l.title,
      href: l.type === "LABEL" ? null : `${coursePath}/lessons/${l.id}`,
      icon: meta.icon,
      iconClass: "text-slate-400",
      order: l.orderIndex,
      hidden: l.status !== "PUBLISHED",
      done: Boolean(l.isCompleted),
    };
  });
  const asg: IndexItem[] = assignments
    .filter((a) => a.moduleId === m.id)
    .map((a) => ({
      key: `assignment-${a.id}`,
      kind: "assignment",
      moduleId: m.id,
      title: a.title,
      href: `${coursePath}/assignments/${a.id}`,
      icon: ClipboardList,
      iconClass: "text-pink-500",
      order: a.orderIndex,
      hidden: a.status === "DRAFT",
      done: Boolean(a.mySubmission),
    }));
  const qz: IndexItem[] = quizzes
    .filter((q) => q.moduleId === m.id)
    .map((q) => ({
      key: `quiz-${q.id}`,
      kind: "quiz",
      moduleId: m.id,
      title: q.title,
      href: `${coursePath}/quizzes/${q.id}`,
      icon: CheckSquare,
      iconClass: "text-violet-500",
      // Đề kiểm tra chưa có orderIndex → xếp sau, theo thứ tự tạo (giống trang khóa học)
      order: 1_000_000 + (Date.parse(q.createdAt) || 0),
      hidden: q.status === "DRAFT",
      done: Boolean(q.myAttempts && q.myAttempts.count > 0 && !q.myAttempts.inProgressAttemptId),
      inProgress: Boolean(q.myAttempts?.inProgressAttemptId),
    }));
  const rank = { lesson: 0, assignment: 1, quiz: 2 } as const;
  return [...lessons, ...asg, ...qz].sort((a, b) => a.order - b.order || rank[a.kind] - rank[b.kind]);
}

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
      setError((err as Error)?.message || "Không tải được nội dung khóa học");
      return null;
    }
  }, [courseId]);

  useEffect(() => {
    let active = true;
    fetchCourseContent(courseId)
      .then((data) => active && setCourse(data))
      .catch((err) => active && setError((err as Error)?.message || "Không tải được nội dung khóa học"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [courseId]);

  return { course, setCourse, loading, error, reload };
}

/** Hồ sơ người dùng đã tải, giữ giữa các trang trong khóa học (chỉ tồn tại phía client) */
let cachedCourseUser: TeacherProfile | null = null;

export function useCurrentUser(role: CourseRole) {
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
  /** Hỏi trước khi rời trang qua mục lục (vd. đang làm bài kiểm tra); trả về false để ở lại */
  beforeNavigate?: () => Promise<boolean>;
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
  searchPlaceholder = "Tìm kiếm trong khóa học...",
  actionRight,
  activeModuleId,
  activeLessonId,
  onModuleClick,
  onAddTopic,
  beforeNavigate,
  children,
}: CourseShellProps) {
  const router = useRouter();
  const currentUser = useCurrentUser(role);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState<TeacherNotification | null | undefined>(undefined);
  const [localSearch, setLocalSearch] = useState("");
  // Topic đã thu gọn trong mục lục (mặc định mở hết)
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  // Bài tập + đề kiểm tra để mục lục liệt kê đủ hoạt động của topic (như trang khóa học)
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [quizzes, setQuizzes] = useState<QuizDto[]>([]);
  const courseIdForIndex = course?.id;
  useEffect(() => {
    if (!courseIdForIndex) return;
    let active = true;
    fetchCourseAssignments(courseIdForIndex)
      .then((data) => active && setAssignments(data))
      .catch(() => {});
    fetchCourseQuizzes(courseIdForIndex)
      .then((data) => active && setQuizzes(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [courseIdForIndex]);

  const coursePath = course ? coursePathOf(role, course.id) : "";

  const goToModule = async (moduleId: string) => {
    if (beforeNavigate && !(await beforeNavigate())) return;
    if (onModuleClick) onModuleClick(moduleId);
    else router.push(`${coursePath}#module-section-${moduleId}`);
    if (window.innerWidth < 1024) setDrawerOpen(false);
  };

  const goToItem = async (item: IndexItem) => {
    if (!item.href) return goToModule(item.moduleId);
    if (beforeNavigate && !(await beforeNavigate())) return;
    setDrawerOpen(false);
    router.push(item.href);
  };

  const indexByModule = useMemo(() => {
    const map = new Map<string, IndexItem[]>();
    for (const m of course?.modules ?? []) map.set(m.id, buildIndexItems(m, assignments, quizzes, coursePath));
    return map;
  }, [course, assignments, quizzes, coursePath]);

  /** Mục đang mở: theo prop activeLessonId (trang bài học) hoặc theo đường dẫn hiện tại (bài tập / đề kiểm tra) */
  const isItemActive = (item: IndexItem) =>
    item.kind === "lesson" ? item.key === `lesson-${activeLessonId}` : Boolean(item.href && pathname?.startsWith(item.href));

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
        aria-label="Mở mục lục khóa học"
        title="Mục lục khóa học"
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
            <span className="truncate">{course?.name || "Mục lục khóa học"}</span>
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
              const isCollapsed = collapsedModules[m.id] ?? false;
              const items = indexByModule.get(m.id) ?? [];
              const hasLessons = items.length > 0;
              return (
                <li key={m.id}>
                  {/* Mũi tên thu gọn / mở rộng là nút riêng — bấm vào tên topic vẫn điều hướng */}
                  <div
                    className={`flex w-full items-start gap-1 rounded-xl p-1.5 pr-2.5 text-[13px] font-semibold transition ${
                      isSelected ? "bg-[#0f6cbf] text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCollapsedModules((prev) => ({ ...prev, [m.id]: !isCollapsed }))}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? "Mở rộng topic" : "Thu gọn topic"}
                      disabled={!hasLessons}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md transition ${
                        isSelected ? "text-white hover:bg-white/20" : "text-slate-400 hover:bg-slate-200"
                      } ${hasLessons ? "" : "opacity-40"}`}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToModule(m.id)}
                      className="line-clamp-2 flex-1 py-0.5 text-left leading-snug"
                    >
                      {m.title}
                    </button>
                  </div>

                  {hasLessons && !isCollapsed && (
                    <ul className="ml-5 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isItemActive(item);
                        return (
                          <li key={item.key}>
                            <button
                              onClick={() => goToItem(item)}
                              title={item.kind === "assignment" ? "Bài tập" : item.kind === "quiz" ? "Đề kiểm tra" : undefined}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition ${
                                isActive
                                  ? "bg-blue-50 font-semibold text-[#0f6cbf]"
                                  : "text-slate-600 hover:bg-blue-50 hover:text-[#0f6cbf]"
                              } ${item.hidden ? "opacity-60" : ""}`}
                            >
                              <Icon className={`h-3.5 w-3.5 shrink-0 ${item.iconClass}`} />
                              <span className="flex-1 truncate">{item.title}</span>
                              {item.hidden && <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                              {role === "STUDENT" && item.inProgress && (
                                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                              )}
                              {role === "STUDENT" && item.done && (
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
