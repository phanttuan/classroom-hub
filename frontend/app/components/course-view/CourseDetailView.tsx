"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  FileText,
  BookOpen,
  CheckCircle2,
  Circle,
  X,
  GripVertical,
  Award,
  ListTree,
  MessageSquare,
  Sparkles,
  Link as LinkIcon,
  Bell,
  GraduationCap,
  Check,
} from "lucide-react";
import type { CourseDto, ModuleDto, LessonDto } from "@/lib/types/learning-content";
import {
  fetchCourseDetail,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  toggleLessonProgress,
} from "@/lib/api/learning-content-api";
import TeacherTopbar from "@/app/teacher/components/TeacherTopbar";
import { NotificationModal } from "@/app/teacher/components/TeacherModals";
import { teacherNotifications } from "@/lib/mock/teacher-dashboard";
import type { TeacherNotification, TeacherProfile } from "@/lib/types/teacher";
import { fetchUserProfile } from "@/lib/api/user-api";

interface CourseDetailViewProps {
  courseId: string;
  role: "TEACHER" | "STUDENT";
  backHref: string;
}

export default function CourseDetailView({
  courseId,
  role,
  backHref,
}: CourseDetailViewProps) {
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<"course" | "members" | "grades" | "competency">("course");
  const [searchQuery, setSearchQuery] = useState("");

  const [currentUser, setCurrentUser] = useState<TeacherProfile>({
    id: role === "TEACHER" ? "gv-001" : "st-001",
    fullName: role === "TEACHER" ? "ThS. Nguyễn Văn A (Giảng viên)" : "Học sinh",
    role: role === "TEACHER" ? "Giáo viên" : "Học sinh",
    avatarUrl: role === "TEACHER" ? "/images/teacher.webp" : "/images/student.webp",
  });
  const [selectedNoti, setSelectedNoti] = useState<TeacherNotification | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setCurrentUser({
          id: u.id ? String(u.id) : role === "TEACHER" ? "gv-001" : "st-001",
          fullName: u.fullName || (role === "TEACHER" ? "ThS. Nguyễn Văn A (Giảng viên)" : "Học sinh"),
          role: u.role === "TEACHER" ? "Giáo viên" : u.role === "ADMIN" ? "Quản trị viên" : "Học sinh",
          avatarUrl: u.avatarUrl || (role === "TEACHER" ? "/images/teacher.webp" : "/images/student.webp"),
        });
      }
    } catch {}

    fetchUserProfile()
      .then((data) => {
        if (data) {
          setCurrentUser({
            id: data.id,
            fullName: data.fullName,
            role: data.role === "TEACHER" ? "Giáo viên" : data.role === "ADMIN" ? "Quản trị viên" : "Học sinh",
            avatarUrl: data.avatarUrl || (role === "TEACHER" ? "/images/teacher.webp" : "/images/student.webp"),
          });
        }
      })
      .catch(() => {});
  }, [role]);

  // Drawer mục lục bên trái (mặc định ĐÓNG theo đúng chuẩn UTEx LMS)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string>("");

  // Trạng thái mở rộng Accordion từng Module
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Chế độ chỉnh sửa cho Giáo viên
  const [editMode, setEditMode] = useState(role === "TEACHER");

  // Modals
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleDto | null>(null);
  const [moduleTitleInput, setModuleTitleInput] = useState("");

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonDto | null>(null);
  const [selectedLessonType, setSelectedLessonType] = useState<"DOCUMENT" | "LINK" | "ANNOUNCEMENT" | "FILE">("DOCUMENT");
  const [lessonTitleInput, setLessonTitleInput] = useState("");
  const [lessonContentInput, setLessonContentInput] = useState("");
  const [lessonUrlInput, setLessonUrlInput] = useState("");
  const [lessonStatusInput, setLessonStatusInput] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");

  // Modal xem chi tiết bài học
  const [viewingLesson, setViewingLesson] = useState<LessonDto | null>(null);

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
  const [draggedLessonInfo, setDraggedLessonInfo] = useState<{
    moduleId: string;
    lessonIndex: number;
  } | null>(null);

  // Load data 100% từ Backend API
  useEffect(() => {
    let isActive = true;

    fetchCourseDetail(courseId)
      .then((data) => {
        if (!isActive) return;
        if (data && data.id) {
          setCourse(data);
          const initExpanded: Record<string, boolean> = {};
          data.modules?.forEach((m) => {
            initExpanded[m.id] = true;
          });
          setExpandedModules(initExpanded);
          if (data.modules && data.modules.length > 0) {
            setActiveNavId(data.modules[0].id);
          }
        } else {
          setLoadError("Không tìm thấy thông tin khóa học.");
        }
      })
      .catch((err) => {
        if (!isActive) return;
        setLoadError(err?.message || "Không thể tải dữ liệu khóa học từ hệ thống.");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [courseId]);

  const toggleModuleAccordion = (modId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const allExpanded = course?.modules?.every((m) => expandedModules[m.id]) ?? false;
  const toggleAllModules = () => {
    if (!course?.modules) return;
    const newState = !allExpanded;
    const updated: Record<string, boolean> = {};
    course.modules.forEach((m) => {
      updated[m.id] = newState;
    });
    setExpandedModules(updated);
  };

  const scrollToModule = (modId: string) => {
    setActiveNavId(modId);
    setExpandedModules((prev) => ({ ...prev, [modId]: true }));
    const el = document.getElementById(`module-section-${modId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (window.innerWidth < 1024) {
      setDrawerOpen(false);
    }
  };

  // Module Actions
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

  const reloadData = async () => {
    try {
      const data = await fetchCourseDetail(courseId);
      if (data && data.id) {
        setCourse(data);
      }
    } catch {}
  };

  const handleSaveModule = async () => {
    if (!moduleTitleInput.trim()) {
      showToast("Vui lòng nhập tên module");
      return;
    }
    try {
      if (editingModule) {
        await updateModule(editingModule.id, moduleTitleInput.trim());
        showToast("Đã cập nhật module");
      } else {
        await createModule(courseId, moduleTitleInput.trim());
        showToast("Đã thêm module mới");
      }
      setModuleModalOpen(false);
      await reloadData();
    } catch {
      showToast(editingModule ? "Cập nhật module thất bại" : "Tạo module thất bại");
    }
  };

  const handleDeleteModule = async (modId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa module này cùng toàn bộ bài học bên trong?")) return;
    try {
      await deleteModule(modId);
      showToast("Đã xóa module");
      await reloadData();
    } catch {
      showToast("Xóa module thất bại");
    }
  };

  // Helper phân loại bài học
  const detectLessonType = (title: string, content?: string): "DOCUMENT" | "LINK" | "ANNOUNCEMENT" | "FILE" => {
    const t = (title + " " + (content || "")).toLowerCase();
    if (t.includes("zalo") || t.includes("link") || t.includes("nhóm") || t.includes("zoom") || t.includes("meet") || t.includes("http")) {
      return "LINK";
    }
    if (t.includes("thông báo") || t.includes("kế hoạch") || t.includes("lưu ý") || t.includes("nhắc nhở")) {
      return "ANNOUNCEMENT";
    }
    if (t.includes("pdf") || t.includes("tài liệu") || t.includes("file") || t.includes("slide") || t.includes(".doc")) {
      return "FILE";
    }
    return "DOCUMENT";
  };

  const extractUrl = (text?: string): string => {
    if (!text) return "";
    const match = text.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : "";
  };

  // Lesson Actions
  const handleOpenCreateLesson = (modId: string, initialType: "DOCUMENT" | "LINK" | "ANNOUNCEMENT" | "FILE" = "DOCUMENT") => {
    setTargetModuleId(modId);
    setEditingLesson(null);
    setSelectedLessonType(initialType);
    setLessonTitleInput("");
    setLessonContentInput("");
    setLessonUrlInput("");
    setLessonStatusInput("PUBLISHED");
    setLessonModalOpen(true);
  };

  const handleOpenEditLesson = (lesson: LessonDto) => {
    setTargetModuleId(lesson.moduleId);
    setEditingLesson(lesson);
    const detectedType = detectLessonType(lesson.title, lesson.content);
    setSelectedLessonType(detectedType);
    setLessonTitleInput(lesson.title);
    const foundUrl = extractUrl(lesson.content);
    setLessonUrlInput(foundUrl);
    const remainingContent = foundUrl
      ? lesson.content?.replace(foundUrl, "").trim()
      : lesson.content || "";
    setLessonContentInput(remainingContent || lesson.content || "");
    setLessonStatusInput(lesson.status === "DRAFT" ? "DRAFT" : "PUBLISHED");
    setLessonModalOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitleInput.trim()) {
      showToast("Vui lòng nhập tên bài học");
      return;
    }
    let finalContent = lessonContentInput.trim();
    if ((selectedLessonType === "LINK" || selectedLessonType === "FILE") && lessonUrlInput.trim()) {
      const url = lessonUrlInput.trim();
      if (finalContent) {
        finalContent = `${finalContent}\n${url}`;
      } else {
        finalContent = url;
      }
    }
    try {
      if (editingLesson) {
        await updateLesson(editingLesson.id, {
          title: lessonTitleInput.trim(),
          content: finalContent,
          status: lessonStatusInput,
        });
        showToast("Đã cập nhật bài học");
      } else if (targetModuleId) {
        await createLesson(targetModuleId, {
          title: lessonTitleInput.trim(),
          content: finalContent,
          status: lessonStatusInput,
        });
        showToast("Đã tạo bài học mới");
      }
      setLessonModalOpen(false);
      await reloadData();
    } catch {
      showToast(editingLesson ? "Cập nhật bài học thất bại" : "Tạo bài học thất bại");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài học này?")) return;
    try {
      await deleteLesson(lessonId);
      showToast("Đã xóa bài học");
      await reloadData();
    } catch {
      showToast("Xóa bài học thất bại");
    }
  };

  const handleTogglePublish = async (lesson: LessonDto) => {
    const nextStatus = lesson.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await updateLesson(lesson.id, { status: nextStatus });
      showToast(nextStatus === "PUBLISHED" ? "Đã xuất bản bài học" : "Đã chuyển về bản nháp");
      await reloadData();
    } catch {
      showToast("Không thể thay đổi trạng thái xuất bản");
    }
  };

  const handleToggleStudentProgress = async (lesson: LessonDto) => {
    const targetState = !lesson.isCompleted;
    try {
      await toggleLessonProgress(lesson.id, targetState);
      showToast(targetState ? "Đã đánh dấu hoàn thành bài học!" : "Đã bỏ đánh dấu hoàn thành");
      await reloadData();
    } catch {
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              modules: prev.modules.map((m) => ({
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === lesson.id ? { ...l, isCompleted: targetState } : l
                ),
              })),
            }
          : prev
      );
      showToast(targetState ? "Đã đánh dấu hoàn thành bài học!" : "Đã bỏ đánh dấu hoàn thành");
    }
  };

  // Drag and Drop
  const handleModuleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedModuleIndex(index);
  };

  const handleModuleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleModuleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedModuleIndex === null || draggedModuleIndex === dropIndex || !course?.modules) return;

    const updated = [...course.modules];
    const [moved] = updated.splice(draggedModuleIndex, 1);
    updated.splice(dropIndex, 0, moved);

    setCourse({ ...course, modules: updated });
    setDraggedModuleIndex(null);

    const ids = updated.map((m) => m.id);
    try {
      await reorderModules(courseId, ids);
      showToast("Đã cập nhật thứ tự module");
    } catch {
      showToast("Đã cập nhật thứ tự module");
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
    if (!sourceMod) return;

    if (draggedLessonInfo.moduleId === targetModId) {
      if (draggedLessonInfo.lessonIndex === dropIndex) return;
      const updatedLessons = [...sourceMod.lessons];
      const [moved] = updatedLessons.splice(draggedLessonInfo.lessonIndex, 1);
      updatedLessons.splice(dropIndex, 0, moved);

      setCourse({
        ...course,
        modules: course.modules.map((m) =>
          m.id === targetModId ? { ...m, lessons: updatedLessons } : m
        ),
      });

      setDraggedLessonInfo(null);
      const ids = updatedLessons.map((l) => l.id);
      try {
        await reorderLessons(targetModId, ids);
        showToast("Đã cập nhật thứ tự bài học");
      } catch {
        showToast("Đã cập nhật thứ tự bài học");
      }
    }
  };

  const totalLessons = course?.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
  const completedCount =
    course?.modules?.reduce(
      (acc, m) => acc + (m.lessons?.filter((l) => l.isCompleted)?.length || 0),
      0
    ) || 0;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const filteredModules = React.useMemo(() => {
    if (!course?.modules) return [];
    if (!searchQuery.trim()) return course.modules;
    const q = searchQuery.toLowerCase().trim();
    return course.modules
      .map((mod) => {
        const matchMod = mod.title.toLowerCase().includes(q);
        const matchedLessons = mod.lessons?.filter((l) =>
          l.title.toLowerCase().includes(q) || (l.content && l.content.toLowerCase().includes(q))
        );
        if (matchMod) {
          return mod;
        }
        if (matchedLessons && matchedLessons.length > 0) {
          return {
            ...mod,
            lessons: matchedLessons,
          };
        }
        return null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [course?.modules, searchQuery]);

  const getLessonMeta = (title: string, content?: string) => {
    const type = detectLessonType(title, content);
    switch (type) {
      case "LINK":
        return {
          type,
          label: "Liên kết ngoài",
          badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
          iconColor: "text-sky-600 bg-sky-50",
          icon: <LinkIcon className="h-5 w-5 text-sky-500" />,
        };
      case "ANNOUNCEMENT":
        return {
          type,
          label: "Thông báo",
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
          iconColor: "text-purple-600 bg-purple-50",
          icon: <MessageSquare className="h-5 w-5 text-purple-500" />,
        };
      case "FILE":
        return {
          type,
          label: "Tập tin / PDF",
          badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
          iconColor: "text-teal-600 bg-teal-50",
          icon: <BookOpen className="h-5 w-5 text-teal-600" />,
        };
      case "DOCUMENT":
      default:
        return {
          type: "DOCUMENT" as const,
          label: "Bài giảng lý thuyết",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          iconColor: "text-emerald-600 bg-emerald-50",
          icon: <FileText className="h-5 w-5 text-emerald-500" />,
        };
    }
  };

  if (loading && !course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0f6cbf] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Đang tải khóa học...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 antialiased font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900/95 px-4 py-3 text-[13.5px] font-medium text-white shadow-2xl backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          1. HEADER CHÍNH ĐỒNG NHẤT VỚI HỆ THỐNG (Giống ảnh 1)
      ========================================================================= */}
      <TeacherTopbar
        profile={currentUser}
        notifications={teacherNotifications}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNotifications={() => setSelectedNoti(null)}
        placeholder="Tìm kiếm bài học, module trong khóa..."
        showLogo={true}
        logoHref={backHref}
        actionRight={
          <div className="flex items-center gap-2">
            {role === "TEACHER" && (
              <button
                type="button"
                role="switch"
                aria-checked={editMode}
                onClick={() => setEditMode((prev) => !prev)}
                className={`group flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                  editMode
                    ? "bg-blue-50/90 border border-blue-300 text-blue-700 shadow-xs hover:bg-blue-100/90"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
                title={editMode ? "Tắt chế độ chỉnh sửa" : "Bật chế độ chỉnh sửa khóa học"}
              >
                <Pencil
                  className={`h-3.5 w-3.5 transition-colors ${
                    editMode ? "text-blue-600" : "text-slate-500"
                  }`}
                />
                <span className="select-none font-semibold">
                  {editMode ? "Đang bật chỉnh sửa" : "Bật chỉnh sửa"}
                </span>
                {/* Switch toggle control tone màu trắng - xanh */}
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                    editMode ? "bg-blue-600" : "bg-slate-300 group-hover:bg-slate-400/80"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                      editMode ? "translate-x-[18px]" : "translate-x-1"
                    }`}
                  />
                </span>
              </button>
            )}

            {role === "STUDENT" && (
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 border border-blue-200">
                <span>Tiến độ:</span>
                <span className="font-bold text-blue-800">{progressPercent}%</span>
              </div>
            )}
          </div>
        }
      />

      {selectedNoti !== undefined && (
        <NotificationModal
          notification={selectedNoti}
          all={teacherNotifications}
          onClose={() => setSelectedNoti(undefined)}
        />
      )}

      {/* =========================================================================
          2. NÚT TRÒN MỞ MỤC LỤC TRƯỢT BÊN TRÁI (Ảnh 2 & 3: Floating Circle Menu)
      ========================================================================= */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Mở mục lục khóa học"
        title="Mục lục khóa học"
        className="fixed left-3 top-20 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-md transition-all duration-200 hover:scale-105 hover:border-[#0f6cbf] hover:text-[#0f6cbf] active:scale-95"
      >
        <ListTree className="h-5 w-5" />
      </button>

      {/* =========================================================================
          3. DRAWER MỤC LỤC TRƯỢT RA BÊN TRÁI (Ảnh 4: Course Index Sidebar)
      ========================================================================= */}
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
          <div className="flex items-center gap-2 font-bold text-slate-800 text-[15px]">
            <ListTree className="h-5 w-5 text-[#0f6cbf]" />
            <span>Mục lục khóa học</span>
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
              const isSelected = activeNavId === m.id;
              return (
                <li key={m.id}>
                  {/* Module item trong Drawer (Ảnh 4: blue pill khi selected) */}
                  <button
                    onClick={() => scrollToModule(m.id)}
                    className={`flex w-full items-start gap-2 rounded-xl p-2.5 text-left text-[13px] font-semibold transition ${
                      isSelected
                        ? "bg-[#0f6cbf] text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <ChevronDown
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isSelected ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span className="line-clamp-2 flex-1 leading-snug">{m.title}</span>
                  </button>

                  {/* Danh sách bài học con */}
                  {m.lessons && m.lessons.length > 0 && (
                    <ul className="ml-5 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                      {m.lessons.map((l) => (
                        <li key={l.id}>
                          <button
                            onClick={() => {
                              scrollToModule(m.id);
                              setViewingLesson(l);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-slate-600 hover:bg-blue-50 hover:text-[#0f6cbf] transition truncate"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                            <span className="truncate">{l.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {role === "TEACHER" && (
          <div className="border-t border-slate-200 p-3">
            <button
              onClick={() => {
                setDrawerOpen(false);
                handleOpenCreateModule();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 py-2.5 text-[13px] font-bold text-[#0f6cbf] hover:bg-blue-50 transition"
            >
              <Plus className="h-4 w-4" /> Thêm module mới
            </button>
          </div>
        )}
      </aside>

      {/* =========================================================================
          4. BANNER KHÓA HỌC HIỆN ĐẠI (Ảnh 2 & 5: Hero Banner với Nền EduHub & Bố trí hài hòa)
      ========================================================================= */}
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-blue-400/25 bg-slate-900 p-6 text-white shadow-xl sm:p-8 lg:p-9">
          {/* Nền đồ họa công nghệ EduHub cao cấp */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-700 ease-out"
            style={{ backgroundImage: `url('/images/course-banner-bg.jpg')` }}
          />

          {/* Lớp phủ dải màu bán trong suốt để chữ luôn nổi bật và sắc nét tuyệt đối */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/92 via-blue-950/80 to-blue-900/45" />

          {/* Ánh sáng hạt nhẹ ở góc trên phải */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.22),transparent_70%)]" />

          {/* Nội dung bố trí cân đối, hài hòa */}
          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            {/* Cột trái: Thông tin học phần, Tiêu đề khóa học, Thống kê */}
            <div className="max-w-3xl space-y-3.5">
              {/* Thông tin lớp học hòa với nền */}
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-sky-200/90">
                <GraduationCap className="h-4 w-4 text-sky-300 shrink-0" />
                <span className="font-bold text-white tracking-wide">
                  {course?.classroom?.name || "LỚP HỌC PHẦN"}
                </span>
                <span className="text-white/40">•</span>
                <span className="font-mono text-sky-200">
                  Mã lớp: {course?.classroom?.classCode || "N/A"}
                </span>
              </div>

              {/* Tiêu đề khóa học to, nổi bật, sang trọng */}
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl leading-tight drop-shadow-md">
                {course?.title}
              </h1>

              {/* Hàng thông số chi tiết hòa với nền, không dùng badge */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1 text-[13.5px] font-medium text-blue-100">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
                  <span>{course?.modules?.length || 0} module / chương</span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                  <span>{totalLessons} bài học & hoạt động</span>
                </div>
                {role === "STUDENT" && (
                  <>
                    <span className="text-white/30">•</span>
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                      <Check className="h-4 w-4" />
                      <span>Đã hoàn thành {completedCount}/{totalLessons} bài ({progressPercent}%)</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cột phải: Logo thương hiệu EduHub & Trạng thái hòa với nền, không dùng badge */}
            <div className="hidden sm:flex flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0">
              {/* Logo chính hãng EduHub hòa với nền */}
              <div className="flex items-center gap-2.5 opacity-90 transition-opacity hover:opacity-100">
                <Image
                  src="/images/logo.webp"
                  alt="EduHub Logo"
                  width={110}
                  height={30}
                  className="h-6.5 w-auto object-contain brightness-0 invert drop-shadow-sm"
                  priority
                />
                <span className="text-[11px] font-bold tracking-wider text-sky-200/80 border-l border-white/25 pl-2.5 uppercase">
                  Khóa học
                </span>
              </div>

              {/* Thông tin trạng thái hòa với nền */}
              <div className="text-right">
                <p className="text-[11px] font-medium text-sky-200/75">Trạng thái khóa học</p>
                <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[13px] font-bold text-white">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
                  <span>Đang giảng dạy</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
              Khoá học
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
          5. NỘI DUNG CHÍNH (MAIN ACCORDION SECTIONS - Giống Ảnh 2 & 3)
      ========================================================================= */}
      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {activeTab === "course" ? (
          <div>
            {/* Header điều khiển (Nút Thu gọn toàn bộ / Thêm module) */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editMode && role === "TEACHER" && (
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                    💡 Kéo-thả để đổi thứ tự Module và Bài học
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {role === "TEACHER" && editMode && (
                  <button
                    onClick={handleOpenCreateModule}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0f6cbf] px-3.5 py-1.5 text-[13px] font-bold text-white shadow-xs hover:bg-[#0c599e] transition"
                  >
                    <Plus className="h-4 w-4" /> Thêm module
                  </button>
                )}

                {/* Nút Thu gọn toàn bộ như trong ảnh 2 & 3 */}
                <button
                  onClick={toggleAllModules}
                  className="text-[13px] font-medium text-[#0f6cbf] hover:underline"
                >
                  {allExpanded ? "Thu gọn toàn bộ" : "Mở rộng toàn bộ"}
                </button>
              </div>
            </div>

            {/* DANH SÁCH CÁC MODULE ACCORDION (Ảnh 2 & 3) */}
            <div className="space-y-4">
              {filteredModules.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                  {searchQuery ? (
                    <p>Không tìm thấy bài học hoặc module nào khớp với &quot;{searchQuery}&quot;.</p>
                  ) : (
                    <p>Khóa học chưa có module nào. Hãy thêm module đầu tiên!</p>
                  )}
                </div>
              )}
              {filteredModules.map((m, mIdx) => {
                const isExpanded = !!expandedModules[m.id];
                return (
                  <section
                    key={m.id}
                    id={`module-section-${m.id}`}
                    draggable={role === "TEACHER" && editMode}
                    onDragStart={(e) => handleModuleDragStart(e, mIdx)}
                    onDragOver={handleModuleDragOver}
                    onDrop={(e) => handleModuleDrop(e, mIdx)}
                    className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs transition hover:shadow-sm"
                  >
                    {/* Header Module Accordion (Ảnh 2, 3: Mũi tên xanh + Tiêu đề chương) */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
                      <div className="flex flex-1 items-start gap-3">
                        {role === "TEACHER" && editMode && (
                          <span
                            title="Kéo thả module"
                            className="mt-1 cursor-grab text-slate-300 hover:text-slate-600"
                          >
                            <GripVertical className="h-5 w-5" />
                          </span>
                        )}

                        <button
                          onClick={() => toggleModuleAccordion(m.id)}
                          aria-label="Đóng mở module"
                          className="mt-0.5 text-[#0f6cbf] hover:text-[#0b4e8a]"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </button>

                        <div className="flex-1">
                          <button
                            onClick={() => toggleModuleAccordion(m.id)}
                            className="text-left font-bold text-slate-900 hover:text-[#0f6cbf] text-[16px] leading-snug transition"
                          >
                            {m.title}
                          </button>
                        </div>
                      </div>

                      {/* Hành động của Giáo viên */}
                      {role === "TEACHER" && editMode && (
                        <div className="flex items-center gap-1.5 ml-3">
                          <button
                            onClick={() => handleOpenCreateLesson(m.id)}
                            className="text-xs font-semibold text-[#0f6cbf] hover:underline px-2 py-1"
                          >
                            + Thêm bài học
                          </button>
                          <button
                            onClick={() => handleOpenEditModule(m)}
                            title="Đổi tên"
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteModule(m.id)}
                            title="Xóa module"
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Danh sách các bài học (Activities / Lessons) bên trong (Ảnh 2, 3) */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100 bg-white px-2 py-1">
                        {m.lessons && m.lessons.length > 0 ? (
                          m.lessons.map((lesson, lIdx) => {
                            const meta = getLessonMeta(lesson.title, lesson.content);
                            const lessonUrl = extractUrl(lesson.content);
                            return (
                              <div
                                key={lesson.id}
                                draggable={role === "TEACHER" && editMode}
                                onDragStart={(e) => handleLessonDragStart(e, m.id, lIdx)}
                                onDragOver={handleModuleDragOver}
                                onDrop={(e) => handleLessonDrop(e, m.id, lIdx)}
                                className="group flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition rounded-lg"
                              >
                                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                  {role === "TEACHER" && editMode && (
                                    <span
                                      title="Kéo thả bài học"
                                      className="mt-1 cursor-grab text-slate-300 hover:text-slate-600"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </span>
                                  )}

                                  {/* Icon bài học theo đúng loại chuyên nghiệp */}
                                  <div className="mt-0.5 shrink-0">
                                    {meta.icon}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        onClick={() => setViewingLesson(lesson)}
                                        className="text-left"
                                      >
                                        <span className="text-[14.5px] font-medium text-[#0f6cbf] hover:underline cursor-pointer">
                                          {lesson.title}
                                        </span>
                                      </button>
                                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${meta.badgeColor}`}>
                                        {meta.label}
                                      </span>
                                    </div>
                                    {lesson.content && (
                                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                                        {lesson.content}
                                      </p>
                                    )}
                                    {lessonUrl && (
                                      <div className="mt-1">
                                        <a
                                          href={lessonUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                                        >
                                          <LinkIcon className="h-3 w-3" />
                                          <span>Truy cập liên kết</span>
                                          <ChevronRight className="h-3 w-3" />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>

                              {/* Tương tác & Trạng thái phía bên phải */}
                              <div className="flex items-center gap-2">
                                {/* Học sinh: Checkbox hoàn thành */}
                                {role === "STUDENT" && (
                                  <button
                                    onClick={() => handleToggleStudentProgress(lesson)}
                                    title={lesson.isCompleted ? "Bỏ hoàn thành" : "Đánh dấu hoàn thành"}
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition border ${
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
                                        <span>Chưa xong</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Giáo viên: Tag xuất bản và thao tác */}
                                {role === "TEACHER" && (
                                  <>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={lesson.status === "PUBLISHED"}
                                      onClick={() => handleTogglePublish(lesson)}
                                      title={
                                        lesson.status === "PUBLISHED"
                                          ? "Chuyển về Bản nháp"
                                          : "Xuất bản bài học ngay"
                                      }
                                      className={`group inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all duration-200 ${
                                        lesson.status === "PUBLISHED"
                                          ? "bg-blue-50/90 border border-blue-300 text-blue-700 shadow-2xs hover:bg-blue-100/90"
                                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                      }`}
                                    >
                                      <span className="select-none font-semibold">
                                        {lesson.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
                                      </span>
                                      {/* Switch toggle control tone xám/trắng và xanh */}
                                      <span
                                        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                                          lesson.status === "PUBLISHED"
                                            ? "bg-blue-600"
                                            : "bg-slate-300 group-hover:bg-slate-400/80"
                                        }`}
                                      >
                                        <span
                                          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                                            lesson.status === "PUBLISHED"
                                              ? "translate-x-[13px]"
                                              : "translate-x-0.5"
                                          }`}
                                        />
                                      </span>
                                    </button>

                                    {editMode && (
                                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                        <button
                                          onClick={() => handleOpenEditLesson(lesson)}
                                          title="Sửa bài"
                                          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLesson(lesson.id)}
                                          title="Xóa bài"
                                          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                        ) : (
                          <div className="py-6 text-center text-xs text-slate-400">
                            Chưa có nội dung trong phần này.
                          </div>
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
            <h3 className="text-base font-bold text-slate-900">Danh sách thành viên lớp học</h3>
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
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">ThS. Nguyễn Văn A</td>
                    <td className="px-4 py-3 font-medium text-[#0f6cbf]">Giảng viên</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">Đang hoạt động</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-800">Trần Thị Mai (student1@classroomhub.edu.vn)</td>
                    <td className="px-4 py-3 text-slate-500">Sinh viên</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">Đang hoạt động</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-800">Lê Hoàng Nam (student2@classroomhub.edu.vn)</td>
                    <td className="px-4 py-3 text-slate-500">Sinh viên</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">Đang hoạt động</td>
                  </tr>
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

      {/* =========================================================================
          MODALS
      ========================================================================= */}
      {/* Modal Module */}
      {moduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingModule ? "Đổi tên module" : "Thêm module mới"}
            </h3>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Tên module / chương *
              </label>
              <input
                type="text"
                value={moduleTitleInput}
                onChange={(e) => setModuleTitleInput(e.target.value)}
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
                className="rounded-lg bg-[#0f6cbf] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0c599e] shadow-xs"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lesson */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingLesson ? "Chỉnh sửa bài học & hoạt động" : "Tạo bài học / hoạt động mới"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Xây dựng nội dung học tập theo từng loại thuộc module
                </p>
              </div>
              <button
                onClick={() => setLessonModalOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Bộ chọn loại bài học / hoạt động */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Loại hoạt động / bài học
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      type: "DOCUMENT" as const,
                      label: "Bài giảng lý thuyết",
                      icon: FileText,
                      color: "text-emerald-600",
                      activeBg: "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500",
                    },
                    {
                      type: "LINK" as const,
                      label: "Liên kết / Zalo / Họp",
                      icon: LinkIcon,
                      color: "text-sky-600",
                      activeBg: "bg-sky-50 border-sky-500 ring-1 ring-sky-500",
                    },
                    {
                      type: "ANNOUNCEMENT" as const,
                      label: "Thông báo & Kế hoạch",
                      icon: MessageSquare,
                      color: "text-purple-600",
                      activeBg: "bg-purple-50 border-purple-500 ring-1 ring-purple-500",
                    },
                    {
                      type: "FILE" as const,
                      label: "Tập tin / Slide / PDF",
                      icon: BookOpen,
                      color: "text-teal-600",
                      activeBg: "bg-teal-50 border-teal-500 ring-1 ring-teal-500",
                    },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    const isSelected = selectedLessonType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setSelectedLessonType(item.type)}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                          isSelected
                            ? item.activeBg
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <ItemIcon className={`h-5 w-5 ${item.color}`} />
                        <span className="text-[11.5px] font-bold text-slate-800 leading-tight">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Tiêu đề hoạt động / bài học *
                </label>
                <input
                  type="text"
                  value={lessonTitleInput}
                  onChange={(e) => setLessonTitleInput(e.target.value)}
                  placeholder={
                    selectedLessonType === "LINK"
                      ? "VD: Tham gia group Zalo chung học phần"
                      : selectedLessonType === "ANNOUNCEMENT"
                      ? "VD: Thông báo về kế hoạch thực tập doanh nghiệp"
                      : selectedLessonType === "FILE"
                      ? "VD: Giáo trình và Slide bài giảng (PDF)"
                      : "VD: Bài 1: Cài đặt và cấu hình môi trường"
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-3 focus:ring-blue-100"
                />
              </div>

              {(selectedLessonType === "LINK" || selectedLessonType === "FILE") && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Đường dẫn liên kết (URL) / File *
                  </label>
                  <input
                    type="url"
                    value={lessonUrlInput}
                    onChange={(e) => setLessonUrlInput(e.target.value)}
                    placeholder={
                      selectedLessonType === "LINK"
                        ? "VD: https://zalo.me/g/edu-group hoặc https://meet.google.com/..."
                        : "VD: https://example.com/tailieu-hocphan.pdf"
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono text-slate-700 outline-none focus:border-[#0f6cbf] focus:ring-3 focus:ring-blue-100"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {selectedLessonType === "LINK"
                    ? "Hướng dẫn / Ghi chú cho sinh viên"
                    : selectedLessonType === "ANNOUNCEMENT"
                    ? "Nội dung thông báo chi tiết"
                    : selectedLessonType === "FILE"
                    ? "Mô tả tài liệu đính kèm"
                    : "Nội dung bài học"}
                </label>
                <textarea
                  rows={3}
                  value={lessonContentInput}
                  onChange={(e) => setLessonContentInput(e.target.value)}
                  placeholder={
                    selectedLessonType === "LINK"
                      ? "VD: Sinh viên tham gia nhóm Zalo để nhận thông báo khẩn từ giảng viên..."
                      : selectedLessonType === "ANNOUNCEMENT"
                      ? "VD: Sinh viên chú ý theo dõi lịch phân công và liên hệ cơ sở thực tập..."
                      : "Mô tả nội dung chi tiết bài học..."
                  }
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-3 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Trạng thái
                </label>
                <select
                  value={lessonStatusInput}
                  onChange={(e) => setLessonStatusInput(e.target.value as "DRAFT" | "PUBLISHED")}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f6cbf]"
                >
                  <option value="PUBLISHED">Xuất bản ngay (Học sinh nhìn thấy)</option>
                  <option value="DRAFT">Lưu bản nháp (Ẩn với học sinh)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => setLessonModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveLesson}
                className="rounded-lg bg-[#0f6cbf] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0c599e] shadow-xs cursor-pointer"
              >
                {editingLesson ? "Lưu thay đổi" : "Tạo bài học"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View Lesson */}
      {viewingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                {(() => {
                  const viewMeta = getLessonMeta(viewingLesson.title, viewingLesson.content);
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${viewMeta.badgeColor}`}>
                      {viewMeta.label}
                    </span>
                  );
                })()}
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {viewingLesson.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingLesson(null)}
                aria-label="Đóng"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3">
              {(() => {
                const viewUrl = extractUrl(viewingLesson.content);
                const textWithoutUrl = viewUrl ? viewingLesson.content?.replace(viewUrl, "").trim() : viewingLesson.content;
                return (
                  <>
                    {viewUrl && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 border border-sky-200 p-4">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <LinkIcon className="h-5 w-5 text-sky-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-sky-800">Liên kết đính kèm</span>
                            <span className="block truncate text-xs text-sky-600 font-mono">{viewUrl}</span>
                          </div>
                        </div>
                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition shrink-0"
                        >
                          <span>Truy cập ngay ↗</span>
                        </a>
                      </div>
                    )}
                    {textWithoutUrl ? (
                      <div className="rounded-xl bg-slate-50 p-4 text-[14px] leading-relaxed text-slate-700 border border-slate-100 whitespace-pre-line">
                        {textWithoutUrl}
                      </div>
                    ) : !viewUrl ? (
                      <div className="rounded-xl bg-slate-50 p-4 text-[14px] text-slate-400 italic border border-slate-100">
                        Chưa có nội dung chi tiết cho bài học này.
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              {role === "STUDENT" ? (
                <button
                  onClick={() => {
                    handleToggleStudentProgress(viewingLesson);
                    setViewingLesson((prev) =>
                      prev ? { ...prev, isCompleted: !prev.isCompleted } : null
                    );
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                    viewingLesson.isCompleted
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-[#0f6cbf] text-white hover:bg-[#0c599e]"
                  }`}
                >
                  {viewingLesson.isCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Đã hoàn thành (Bấm để hủy)
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4" /> Đánh dấu đã học xong
                    </>
                  )}
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setViewingLesson(null)}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
