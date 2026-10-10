"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  GripVertical,
  Award,
  Sparkles,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Archive,
  RotateCcw,
  FileText,
  Download,
} from "lucide-react";
import type { LessonDto, ModuleDto, ResourceDto } from "@/lib/types/learning-content";
import type { CourseMembersResponse } from "@/lib/types/course";
import {
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  updateLesson,
  deleteLesson,
  reorderLessons,
  toggleLessonProgress,
} from "@/lib/api/learning-content-api";
import { triggerResourceDownload } from "@/lib/api/resource-api";
import { updateCourseStatus, fetchCourseMembers } from "@/lib/api/course-api";
import DocumentPreview from "@/components/resource/DocumentPreview";
import RichContent from "@/components/content/RichContent";
import KebabMenu from "@/components/ui/KebabMenu";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { LESSON_TYPE_META, fileTypeLabel, formatFileSize } from "@/lib/lesson-types";
import CourseShell, { coursePathOf, useCourseContent } from "./CourseShell";
import CourseHero, { type HeroStatusTone } from "./CourseHero";
import CourseSkeleton from "./CourseSkeleton";

const COURSE_STATUS: Record<string, { caption: string; label: string; tone: HeroStatusTone }> = {
  ACTIVE: { caption: "Trạng thái khóa học", label: "Đang giảng dạy", tone: "emerald" },
  CLOSED: { caption: "Trạng thái khóa học", label: "Đã kết thúc", tone: "amber" },
  ARCHIVED: { caption: "Trạng thái khóa học", label: "Đã lưu trữ", tone: "slate" },
};

interface CourseDetailViewProps {
  courseId: string;
  role: "TEACHER" | "STUDENT";
  backHref: string;
}

export default function CourseDetailView({ courseId, role, backHref }: CourseDetailViewProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const { course, setCourse, loading, error: loadError, reload: reloadData } = useCourseContent(courseId);
  const coursePath = coursePathOf(role, courseId);
  const [activeTab, setActiveTab] = useState<"course" | "members" | "grades" | "competency">("course");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNavId, setActiveNavId] = useState<string>("");

  // Trạng thái mở rộng Accordion từng Topic (mặc định mở)
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Chế độ chỉnh sửa cho Giáo viên
  const [editModeSetting, setEditMode] = useState(role === "TEACHER");
  // Lớp đã lưu trữ là chỉ đọc (backend cũng chặn mọi thay đổi nội dung)
  const isArchived = course?.status === "ARCHIVED";
  const editMode = editModeSetting && !isArchived;
  const [restoring, setRestoring] = useState(false);

  // Modal Topic
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleDto | null>(null);
  const [moduleTitleInput, setModuleTitleInput] = useState("");

  const [previewResource, setPreviewResource] = useState<ResourceDto | null>(null);

  // Danh sách thành viên lớp học (tải khi mở tab members)
  const [members, setMembers] = useState<CourseMembersResponse | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  useEffect(() => {
    if (activeTab !== "members" || members || membersError) return;
    let active = true;
    setMembersLoading(true);
    fetchCourseMembers(courseId)
      .then((data) => active && setMembers(data))
      .catch((err) => active && setMembersError((err as Error)?.message || "Không tải được danh sách thành viên"))
      .finally(() => active && setMembersLoading(false));
    return () => {
      active = false;
    };
  }, [activeTab, courseId, members, membersError]);

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(""), 2500);
  };

  // Drag & drop
  const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(null);
  const [draggedLessonInfo, setDraggedLessonInfo] = useState<{ moduleId: string; lessonIndex: number } | null>(null);

  const isExpanded = (modId: string) => !collapsedModules[modId];
  const toggleModuleAccordion = (modId: string) =>
    setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));

  const allExpanded = course?.modules?.every((m) => isExpanded(m.id)) ?? false;
  const toggleAllModules = () => {
    if (!course?.modules) return;
    const collapse = allExpanded;
    setCollapsedModules(Object.fromEntries(course.modules.map((m) => [m.id, collapse])));
  };

  const scrollToModule = (modId: string) => {
    setActiveNavId(modId);
    setCollapsedModules((prev) => ({ ...prev, [modId]: false }));
    const el = document.getElementById(`module-section-${modId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Quay về từ trang bài học / trang soạn thảo với #module-section-<id> → cuộn tới topic đó
  const scrolledFromHash = useRef(false);
  useEffect(() => {
    if (!course || scrolledFromHash.current) return;
    scrolledFromHash.current = true;
    const match = window.location.hash.match(/^#module-section-(\d+)$/);
    if (match) window.setTimeout(() => scrollToModule(match[1]), 100);
  }, [course]);

  // ===================== Topic =====================
  const handleOpenCreateModule = () => {
    setEditingModule(null);
    setModuleTitleInput("");
    setModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod: ModuleDto) => {
    setEditingModule(mod);
    setModuleTitleInput(mod.title);
    setModuleModalOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleTitleInput.trim()) {
      showToast("Vui lòng nhập tên topic");
      return;
    }
    try {
      if (editingModule) {
        await updateModule(editingModule.id, moduleTitleInput.trim());
        showToast("Đã cập nhật topic");
      } else {
        await createModule(courseId, moduleTitleInput.trim());
        showToast("Đã thêm topic mới");
      }
      setModuleModalOpen(false);
      await reloadData();
    } catch (err) {
      showToast((err as Error)?.message || (editingModule ? "Cập nhật topic thất bại" : "Tạo topic thất bại"));
    }
  };

  const handleDeleteModule = async (mod: ModuleDto) => {
    const ok = await confirm({
      tone: "danger",
      title: "Xóa topic này?",
      message: (
        <>
          Topic <strong className="text-slate-800">{mod.title}</strong> cùng toàn bộ hoạt động, tài nguyên và tệp
          đính kèm bên trong sẽ bị xóa vĩnh viễn.
        </>
      ),
      confirmText: "Xóa topic",
    });
    if (!ok) return;
    try {
      await deleteModule(mod.id);
      showToast("Đã xóa topic");
      await reloadData();
    } catch (err) {
      showToast((err as Error)?.message || "Xóa topic thất bại");
    }
  };

  const handleRestoreCourse = async () => {
    const ok = await confirm({
      tone: "primary",
      icon: RotateCcw,
      title: "Khôi phục khóa học?",
      message: (
        <>
          <strong className="text-slate-800">{course?.name}</strong> sẽ hoạt động trở lại: chỉnh sửa được nội dung và nhận
          sinh viên tham gia bằng mã.
        </>
      ),
      confirmText: "Khôi phục",
    });
    if (!ok) return;
    setRestoring(true);
    try {
      await updateCourseStatus(courseId, "ACTIVE");
      showToast("Đã khôi phục khóa học");
      await reloadData();
    } catch (err) {
      showToast((err as Error)?.message || "Không thể khôi phục khóa học");
    } finally {
      setRestoring(false);
    }
  };

  // ===================== Hoạt động / tài nguyên =====================
  const handleDeleteLesson = async (lesson: LessonDto) => {
    const ok = await confirm({
      tone: "danger",
      title: "Xóa hoạt động / tài nguyên?",
      message: (
        <>
          <strong className="text-slate-800">{lesson.title}</strong> và các tệp đính kèm sẽ bị xóa vĩnh viễn, tiến độ
          học của sinh viên với mục này cũng mất.
        </>
      ),
      confirmText: "Xóa",
    });
    if (!ok) return;
    try {
      await deleteLesson(lesson.id);
      showToast("Đã xóa");
      await reloadData();
    } catch (err) {
      showToast((err as Error)?.message || "Xóa thất bại");
    }
  };

  const handleTogglePublish = async (lesson: LessonDto) => {
    const nextStatus = lesson.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await updateLesson(lesson.id, { status: nextStatus });
      showToast(nextStatus === "PUBLISHED" ? "Đã hiện với sinh viên" : "Đã ẩn với sinh viên");
      await reloadData();
    } catch (err) {
      showToast((err as Error)?.message || "Không thể thay đổi trạng thái hiển thị");
    }
  };

  const handleToggleStudentProgress = async (lesson: LessonDto) => {
    const targetState = !lesson.isCompleted;
    setCourse((prev) =>
      prev
        ? {
            ...prev,
            modules: prev.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) => (l.id === lesson.id ? { ...l, isCompleted: targetState } : l)),
            })),
          }
        : prev
    );
    try {
      await toggleLessonProgress(lesson.id, targetState);
      showToast(targetState ? "Đã đánh dấu hoàn thành!" : "Đã bỏ đánh dấu hoàn thành");
      await reloadData();
    } catch {
      showToast("Không cập nhật được tiến độ");
      await reloadData();
    }
  };

  // ===================== Kéo thả =====================
  const handleModuleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedModuleIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleModuleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedModuleIndex === null || draggedModuleIndex === dropIndex || !course?.modules) return;

    let updated = [...course.modules];
    const [moved] = updated.splice(draggedModuleIndex, 1);
    updated.splice(dropIndex, 0, moved);
    // Topic mặc định "Chung" luôn đứng đầu
    const defaultModule = updated.find((m) => m.isDefault);
    if (defaultModule) updated = [defaultModule, ...updated.filter((m) => m !== defaultModule)];

    setCourse({ ...course, modules: updated });
    setDraggedModuleIndex(null);

    try {
      await reorderModules(courseId, updated.map((m) => m.id));
      showToast("Đã cập nhật thứ tự topic");
    } catch {
      showToast("Không lưu được thứ tự topic");
      await reloadData();
    }
  };

  const handleLessonDragStart = (e: React.DragEvent, moduleId: string, lessonIndex: number) => {
    e.stopPropagation();
    setDraggedLessonInfo({ moduleId, lessonIndex });
  };

  const handleLessonDrop = async (e: React.DragEvent, targetModId: string, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedLessonInfo || !course?.modules) return;
    const sourceMod = course.modules.find((m) => m.id === draggedLessonInfo.moduleId);
    if (!sourceMod || draggedLessonInfo.moduleId !== targetModId) return;
    if (draggedLessonInfo.lessonIndex === dropIndex) return;

    const updatedLessons = [...sourceMod.lessons];
    const [moved] = updatedLessons.splice(draggedLessonInfo.lessonIndex, 1);
    updatedLessons.splice(dropIndex, 0, moved);

    setCourse({
      ...course,
      modules: course.modules.map((m) => (m.id === targetModId ? { ...m, lessons: updatedLessons } : m)),
    });
    setDraggedLessonInfo(null);

    try {
      await reorderLessons(targetModId, updatedLessons.map((l) => l.id));
      showToast("Đã cập nhật thứ tự");
    } catch {
      showToast("Không lưu được thứ tự");
      await reloadData();
    }
  };

  // ===================== Thống kê & tìm kiếm =====================
  const totalLessons = course?.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
  // Tiến độ chỉ tính mục có thể hoàn thành — bỏ "Văn bản và phương tiện" (khớp với backend)
  const trackableLessons = course?.modules?.flatMap((m) => m.lessons.filter((l) => l.type !== "LABEL")) ?? [];
  const trackableCount = trackableLessons.length;
  const completedCount = trackableLessons.filter((l) => l.isCompleted).length;
  const progressPercent = trackableCount > 0 ? Math.round((completedCount / trackableCount) * 100) : 0;

  const query = searchQuery.toLowerCase().trim();
  const filteredModules = !course?.modules
    ? []
    : !query
      ? course.modules
      : course.modules
          .map((mod) => {
            if (mod.title.toLowerCase().includes(query)) return mod;
            const matched = mod.lessons?.filter((l) => l.title.toLowerCase().includes(query));
            return matched?.length ? { ...mod, lessons: matched } : null;
          })
          .filter((m): m is NonNullable<typeof m> => m !== null);

  const isSearching = searchQuery.trim().length > 0;

  if (loading && !course) {
    return (
      <CourseShell course={null} role={role} backHref={backHref}>
        <CourseSkeleton />
      </CourseShell>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f0f2f5] p-6 text-center">
        <p className="font-semibold text-slate-800">{loadError || "Không tìm thấy khóa học"}</p>
        <Link href={backHref} className="text-sm font-semibold text-[#0f6cbf] hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  /** Một dòng hoạt động / tài nguyên trong topic (giống trang khóa học Moodle) */
  const renderLesson = (m: ModuleDto, lesson: LessonDto, lIdx: number) => {
    const meta = LESSON_TYPE_META[lesson.type] ?? LESSON_TYPE_META.PAGE;
    const Icon = meta.icon;
    const settings = lesson.settings ?? {};
    const hidden = lesson.status !== "PUBLISHED";
    const viewHref = `${coursePath}/lessons/${lesson.id}`;
    const editHref = `/teacher/content/courses/${courseId}/lessons/${lesson.id}/edit`;
    const canDrag = role === "TEACHER" && editMode && !isSearching;
    const file = lesson.type === "FILE" ? lesson.resources?.[0] : undefined;
    const fileInfo = file
      ? [settings.showSize !== false && formatFileSize(file.fileSizeBytes), settings.showType !== false && fileTypeLabel(file.fileName, file.mimeType)]
          .filter(Boolean)
          .join(" · ")
      : "";

    return (
      <div
        key={lesson.id}
        draggable={canDrag}
        onDragStart={(e) => handleLessonDragStart(e, m.id, lIdx)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleLessonDrop(e, m.id, lIdx)}
        className={`group flex items-start gap-3 rounded-lg px-4 py-3.5 transition hover:bg-slate-50/80 ${hidden ? "bg-slate-50/60" : ""}`}
      >
        {canDrag && (
          <span title="Kéo thả để đổi thứ tự" className="mt-2 cursor-grab text-slate-300 hover:text-slate-600">
            <GripVertical className="h-4 w-4" />
          </span>
        )}

        {lesson.type === "LABEL" ? (
          <div className={`min-w-0 flex-1 ${hidden ? "opacity-60" : ""}`}>
            <RichContent html={lesson.content} />
          </div>
        ) : (
          <>
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.iconClass} ${hidden ? "opacity-60" : ""}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className={`min-w-0 flex-1 ${hidden ? "opacity-70" : ""}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{meta.label}</p>
              <Link
                href={viewHref}
                className="text-[15px] font-semibold leading-snug text-[#0f6cbf] hover:underline"
              >
                {lesson.title}
              </Link>
              {fileInfo && <span className="ml-2 text-[12px] text-slate-400">{fileInfo}</span>}
              {lesson.type === "URL" && lesson.externalUrl && (
                <a
                  href={lesson.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 flex w-fit max-w-full items-center gap-1 truncate text-[12px] text-sky-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{lesson.externalUrl}</span>
                </a>
              )}
              {settings.showDescription && lesson.description && (
                <RichContent html={lesson.description} className="mt-1.5 !text-[13.5px] text-slate-600" />
              )}
              {lesson.type === "FOLDER" && settings.folderDisplay === "INLINE" && (lesson.resources?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-white p-2">
                  {lesson.resources!.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-[13px]">
                      <FileText className="h-4 w-4 shrink-0 text-sky-600" />
                      <button
                        onClick={() => setPreviewResource(r)}
                        className="min-w-0 flex-1 truncate text-left text-[#0f6cbf] hover:underline"
                      >
                        {r.fileName}
                      </button>
                      <span className="text-[11.5px] text-slate-400">{formatFileSize(r.fileSizeBytes)}</span>
                      <button
                        onClick={() => triggerResourceDownload(r.id, r.fileName).catch(() => showToast("Không tải được tệp"))}
                        aria-label={`Tải ${r.fileName}`}
                        className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          {role === "STUDENT" && lesson.type !== "LABEL" && (
            <button
              onClick={() => handleToggleStudentProgress(lesson)}
              title={lesson.isCompleted ? "Bỏ hoàn thành" : "Đánh dấu hoàn thành"}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                lesson.isCompleted
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              {lesson.isCompleted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Đã hoàn thành</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 text-slate-300" />
                  <span>Đánh dấu hoàn thành</span>
                </>
              )}
            </button>
          )}

          {role === "TEACHER" && (
            <>
              {/* Như Moodle: chỉ đánh dấu mục đang ẩn; đổi Hiện / Ẩn trong menu ⋮ */}
              {hidden && (
                <span className="inline-flex select-none items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600">
                  <EyeOff className="h-3.5 w-3.5" /> Ẩn với sinh viên
                </span>
              )}

              {editMode && (
                <KebabMenu
                  items={[
                    { label: "Xem", icon: Eye, onClick: () => router.push(viewHref), hidden: lesson.type === "LABEL" },
                    { label: "Chỉnh sửa", icon: Pencil, onClick: () => router.push(editHref) },
                    {
                      label: hidden ? "Hiện với sinh viên" : "Ẩn với sinh viên",
                      icon: hidden ? Eye : EyeOff,
                      onClick: () => handleTogglePublish(lesson),
                    },
                    { label: "Xóa", icon: Trash2, danger: true, onClick: () => handleDeleteLesson(lesson) },
                  ]}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <CourseShell
      course={course}
      role={role}
      backHref={backHref}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Tìm kiếm topic, hoạt động trong khóa..."
      activeModuleId={activeNavId || course.modules[0]?.id}
      onModuleClick={scrollToModule}
      onAddTopic={role === "TEACHER" && !isArchived ? handleOpenCreateModule : undefined}
      actionRight={
        <div className="flex items-center gap-2">
          {role === "TEACHER" && !isArchived && (
            <button
              type="button"
              role="switch"
              aria-checked={editMode}
              onClick={() => setEditMode((prev) => !prev)}
              className={`group flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                editMode
                  ? "border border-blue-300 bg-blue-50/90 text-blue-700 shadow-xs hover:bg-blue-100/90"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
              title={editMode ? "Tắt chế độ chỉnh sửa" : "Bật chế độ chỉnh sửa khóa học"}
            >
              <Pencil className={`h-3.5 w-3.5 ${editMode ? "text-blue-600" : "text-slate-500"}`} />
              <span className="select-none">{editMode ? "Đang bật chỉnh sửa" : "Bật chỉnh sửa"}</span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  editMode ? "bg-blue-600" : "bg-slate-300 group-hover:bg-slate-400/80"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    editMode ? "translate-x-[18px]" : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          )}
          {role === "STUDENT" && (
            <div className="hidden items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:flex">
              <span>Tiến độ:</span>
              <span className="font-bold text-blue-800">{progressPercent}%</span>
            </div>
          )}
        </div>
      }
    >
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900/95 px-4 py-3 text-[13.5px] font-medium text-white shadow-2xl backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          4. BANNER KHÓA HỌC HIỆN ĐẠI (Ảnh 2 & 5: Hero Banner với Nền EduHub & Bố trí hài hòa)
      ========================================================================= */}
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <CourseHero
          eyebrow={{
            primary: course.owner?.fullName || "KHÓA HỌC",
            secondary: `Mã khóa học: ${course.courseCode}`,
            secondaryMono: true,
          }}
          title={course.name}
          stats={[
            { dot: "sky", label: `${course.modules.length} topic` },
            { dot: "amber", label: `${totalLessons} hoạt động & tài nguyên` },
            ...(role === "STUDENT"
              ? [{ icon: Check, highlight: true, label: `Đã hoàn thành ${completedCount}/${trackableCount} (${progressPercent}%)` }]
              : []),
          ]}
          brandTag="Khóa học"
          status={COURSE_STATUS[course.status]}
        />

        {isArchived && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3">
            <p className="flex items-center gap-2.5 text-[13.5px] text-slate-700">
              <Archive className="h-5 w-5 shrink-0 text-slate-500" />
              <span>
                <strong className="text-slate-900">Khóa học đã lưu trữ — chế độ chỉ đọc.</strong>{" "}
                {role === "TEACHER"
                  ? "Nội dung, bài nộp và điểm số được giữ nguyên nhưng không thể chỉnh sửa."
                  : "Bạn vẫn xem lại được nội dung nhưng khóa học không còn hoạt động."}
              </span>
            </p>
            {role === "TEACHER" && (
              <button
                onClick={handleRestoreCourse}
                disabled={restoring}
                className="flex items-center gap-1.5 rounded-lg bg-[#0f6cbf] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
              >
                <RotateCcw className={`h-4 w-4 ${restoring ? "animate-spin" : ""}`} /> Khôi phục khóa học
              </button>
            )}
          </div>
        )}

        {/* Thanh Tab trắng nằm bên dưới banner (Ảnh 2, 3: Khoá học, Danh sách thành viên, Điểm số, Năng lực) */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200/90 bg-white px-2 shadow-xs sm:px-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("course")}
              className={`border-b-2 px-3 py-3 text-[14px] font-bold transition sm:px-4 ${
                activeTab === "course"
                  ? "border-[#0f6cbf] text-[#0f6cbf]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Nội dung
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`border-b-2 px-3 py-3 text-[14px] font-semibold transition sm:px-4 ${
                activeTab === "members"
                  ? "border-[#0f6cbf] text-[#0f6cbf]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Danh sách thành viên
            </button>
            <button
              onClick={() => setActiveTab("grades")}
              className={`border-b-2 px-3 py-3 text-[14px] font-semibold transition sm:px-4 ${
                activeTab === "grades"
                  ? "border-[#0f6cbf] text-[#0f6cbf]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Điểm số
            </button>
            <button
              onClick={() => setActiveTab("competency")}
              className={`border-b-2 px-3 py-3 text-[14px] font-semibold transition sm:px-4 ${
                activeTab === "competency"
                  ? "border-[#0f6cbf] text-[#0f6cbf]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Năng lực
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. NỘI DUNG CHÍNH — các Topic (section) và hoạt động / tài nguyên
      ========================================================================= */}
      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {activeTab === "course" ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editMode && role === "TEACHER" && (
                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    💡 Kéo-thả để đổi thứ tự Topic và hoạt động
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {role === "TEACHER" && editMode && (
                  <button
                    onClick={handleOpenCreateModule}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0f6cbf] px-3.5 py-1.5 text-[13px] font-bold text-white shadow-xs transition hover:bg-[#0c599e]"
                  >
                    <Plus className="h-4 w-4" /> Thêm Topic
                  </button>
                )}
                <button onClick={toggleAllModules} className="text-[13px] font-medium text-[#0f6cbf] hover:underline">
                  {allExpanded ? "Thu gọn toàn bộ" : "Mở rộng toàn bộ"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredModules.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                  {isSearching ? (
                    <p>Không tìm thấy topic hoặc hoạt động nào khớp với &quot;{searchQuery}&quot;.</p>
                  ) : (
                    <p>Khóa học chưa có topic nào.</p>
                  )}
                </div>
              )}
              {filteredModules.map((m, mIdx) => {
                const expanded = isExpanded(m.id);
                const canDrag = role === "TEACHER" && editMode && !m.isDefault && !isSearching;
                return (
                  <section
                    key={m.id}
                    id={`module-section-${m.id}`}
                    draggable={canDrag}
                    onDragStart={(e) => handleModuleDragStart(e, mIdx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleModuleDrop(e, mIdx)}
                    className="scroll-mt-20 rounded-xl border border-slate-200/90 bg-white shadow-xs transition hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                      <div className="flex flex-1 items-start gap-3">
                        {canDrag && (
                          <span title="Kéo thả topic" className="mt-1 cursor-grab text-slate-300 hover:text-slate-600">
                            <GripVertical className="h-5 w-5" />
                          </span>
                        )}
                        <button
                          onClick={() => toggleModuleAccordion(m.id)}
                          aria-label={expanded ? "Thu gọn topic" : "Mở rộng topic"}
                          className="mt-0.5 text-[#0f6cbf] hover:text-[#0b4e8a]"
                        >
                          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => toggleModuleAccordion(m.id)}
                          className="flex-1 text-left text-[16px] font-bold leading-snug text-slate-900 transition hover:text-[#0f6cbf]"
                        >
                          {m.title}
                        </button>
                      </div>

                      {role === "TEACHER" && editMode && (
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/teacher/content/courses/${courseId}/lessons/new?section=${m.id}`}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[#0f6cbf] transition hover:bg-blue-50"
                          >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Thêm hoạt động hoặc tài nguyên</span>
                          </Link>
                          {!m.isDefault && (
                            <KebabMenu
                              label="Thao tác với topic"
                              items={[
                                { label: "Đổi tên topic", icon: Pencil, onClick: () => handleOpenEditModule(m) },
                                { label: "Xóa topic", icon: Trash2, danger: true, onClick: () => handleDeleteModule(m) },
                              ]}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {expanded && (
                      <div className="divide-y divide-slate-100 px-2 py-1">
                        {m.lessons && m.lessons.length > 0 ? (
                          m.lessons.map((lesson, lIdx) => renderLesson(m, lesson, lIdx))
                        ) : (
                          <div className="py-6 text-center text-xs text-slate-400">Chưa có nội dung trong topic này.</div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        ) : activeTab === "members" ? (
          <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">Danh sách thành viên khóa học</h3>
            <p className="mt-1 text-xs text-slate-500">
              Danh sách giảng viên và sinh viên tham gia khóa học.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {membersLoading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                        Đang tải danh sách thành viên...
                      </td>
                    </tr>
                  ) : membersError ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm">
                        <p className="text-rose-600">{membersError}</p>
                        <button
                          onClick={() => setMembersError("")}
                          className="mt-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[#0f6cbf] hover:bg-blue-50"
                        >
                          Thử lại
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {members?.owner && (
                        <tr>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {members.owner.fullName} <span className="font-normal text-slate-400">({members.owner.email})</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#0f6cbf]">Giảng viên</td>
                          <td className="px-4 py-3 text-emerald-600 font-medium">Đang hoạt động</td>
                        </tr>
                      )}
                      {members?.students.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-3 text-slate-800">
                            {s.fullName} <span className="text-slate-400">({s.email})</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">Sinh viên</td>
                          <td className="px-4 py-3 text-emerald-600 font-medium">Đang hoạt động</td>
                        </tr>
                      ))}
                      {!members?.owner && (members?.students.length ?? 0) === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                            Chưa có thành viên nào trong khóa học.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "grades" ? (
          <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">Sổ điểm đánh giá quá trình</h3>
            <p className="mt-1 text-xs text-slate-500">
              Tổng hợp điểm các bài tập và hoạt động học tập.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <Award className="h-10 w-10 text-[#0f6cbf] mb-2" />
              <p className="font-bold text-slate-800">Sổ điểm khóa học</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Điểm số các bài tập và bài kiểm tra sẽ được đồng bộ trực tiếp tại đây.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">Khung năng lực học phần</h3>
            <p className="mt-1 text-xs text-slate-500">
              Chuẩn đầu ra và các tiêu chí đánh giá năng lực của sinh viên.
            </p>
          </div>
        )}
      </main>

      {/* Modal Topic */}
      {moduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <button
            type="button"
            aria-label="Đóng"
            tabIndex={-1}
            onClick={() => setModuleModalOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{editingModule ? "Đổi tên topic" : "Thêm topic mới"}</h3>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Tên topic *</label>
              <input
                type="text"
                autoFocus
                value={moduleTitleInput}
                onChange={(e) => setModuleTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveModule()}
                placeholder="VD: Chương 1: Giới thiệu..."
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-3 focus:ring-blue-100"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModuleModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveModule}
                className="rounded-lg bg-[#0f6cbf] px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#0c599e]"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      <DocumentPreview
        isOpen={!!previewResource}
        resourceId={previewResource?.id ?? null}
        initialFileName={previewResource?.fileName}
        initialFileSize={previewResource?.fileSizeBytes}
        initialMimeType={previewResource?.mimeType}
        onClose={() => setPreviewResource(null)}
      />
    </CourseShell>
  );
}
