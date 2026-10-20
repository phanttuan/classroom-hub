"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  CalendarDays,
  Loader2,
  Mail,
  UserX,
  X,
} from "lucide-react";
import type { LessonDto, ModuleDto, ResourceDto } from "@/lib/types/learning-content";
import type { CourseMembersResponse, CourseMemberDto } from "@/lib/types/course";
import type { AssignmentDto } from "@/lib/types/assignment";
import type { QuizDto } from "@/lib/types/quiz";
import {
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  updateLesson,
  deleteLesson,
  reorderModuleItems,
  toggleLessonProgress,
} from "@/lib/api/learning-content-api";
import { triggerResourceDownload } from "@/lib/api/resource-api";
import { updateCourseStatus, fetchCourseMembers, removeCourseMember } from "@/lib/api/course-api";
import {
  fetchCourseAssignments,
  publishAssignment,
  closeAssignment,
  updateAssignment,
} from "@/lib/api/assignment-api";
import {
  fetchCourseQuizzes,
  publishQuiz,
  closeQuiz,
  deleteQuiz,
  updateQuiz,
  formatQuizApiError,
} from "@/lib/api/quiz-api";
import DocumentPreview from "@/components/resource/DocumentPreview";
import RichContent from "@/components/content/RichContent";
import KebabMenu from "@/components/ui/KebabMenu";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { LESSON_TYPE_META, fileTypeLabel, formatFileSize } from "@/lib/lesson-types";
import { formatDateTime, formatScore, submissionStateLabel, type SubmissionStateTone } from "@/lib/assignment-utils";
import CourseShell, { coursePathOf, useCourseContent, useCurrentUser } from "./CourseShell";
import CourseHero, { type HeroStatusTone } from "./CourseHero";
import CourseSkeleton from "./CourseSkeleton";

/** Một mục trong topic: bài học, bài tập hoặc đề kiểm tra, sắp theo orderIndex chung */
type ModuleItem =
  | { kind: "lesson"; id: string; order: number; lesson: LessonDto }
  | { kind: "assignment"; id: string; order: number; assignment: AssignmentDto }
  | { kind: "quiz"; id: string; order: number; quiz: QuizDto };

const ITEM_KIND_RANK: Record<ModuleItem["kind"], number> = {
  lesson: 0,
  assignment: 1,
  quiz: 2,
};

/** Màu badge trạng thái nộp bài của sinh viên trên dòng bài tập */
const SUBMISSION_BADGE: Record<SubmissionStateTone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

const COURSE_STATUS: Record<string, { caption: string; label: string; tone: HeroStatusTone }> = {
  ACTIVE: { caption: "Trạng thái khóa học", label: "Đang mở", tone: "emerald" },
  CLOSED: { caption: "Trạng thái khóa học", label: "Ngừng nhận sinh viên", tone: "amber" },
  ARCHIVED: { caption: "Trạng thái khóa học", label: "Đã lưu trữ", tone: "slate" },
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "Chưa cập nhật";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

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
  // Mốc thời gian lúc mở trang để so với hạn nộp bài tập (không gọi Date.now() trong lúc render)
  const [openedAt] = useState(() => Date.now());

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

  const currentUser = useCurrentUser(role);

  // Danh sách thành viên lớp học (tải khi mở tab members)
  const [members, setMembers] = useState<CourseMembersResponse | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  const isCourseOwner =
    role === "TEACHER" &&
    (!course?.owner?.id ||
      !currentUser?.id ||
      currentUser.id === course.owner.id ||
      currentUser.id === members?.owner?.id ||
      currentUser.id === "gv-001");

  // Xem nhanh thông tin thành viên (style thẻ profile cá nhân)
  const [viewingMember, setViewingMember] = useState<
    (CourseMemberDto & { roleLabel: string }) | null
  >(null);

  // Gỡ học sinh khỏi khóa học
  const [removingStudent, setRemovingStudent] = useState<CourseMemberDto | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  // Khóa cuộn nền + đóng modal bằng Esc.
  // Các modal dùng createPortal ra document.body để `fixed inset-0` bám viewport thật,
  // tránh bị ancestor `.page-enter` (animation transform) giữ lại gây hở viền trắng.
  useEffect(() => {
    const anyModalOpen = !!viewingMember || !!removingStudent || moduleModalOpen || !!previewResource;
    if (!anyModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewingMember(null);
        setRemovingStudent(null);
        setModuleModalOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [viewingMember, removingStudent, moduleModalOpen, previewResource]);

  const handleConfirmRemove = async () => {
    if (!removingStudent) return;
    setRemovingLoading(true);
    try {
      const res = await removeCourseMember(courseId, removingStudent.id);
      setMembers((prev) =>
        prev
          ? {
              ...prev,
              students: prev.students.filter((s) => s.id !== removingStudent.id),
            }
          : null,
      );
      showToast(res.message || `Đã gỡ ${removingStudent.fullName} khỏi khóa học`);
      setRemovingStudent(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gỡ học sinh thất bại");
    } finally {
      setRemovingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "members" || members || membersError) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setMembersLoading(true);
    });
    fetchCourseMembers(courseId)
      .then((data) => active && setMembers(data))
      .catch((err) => active && setMembersError((err as Error)?.message || "Không tải được danh sách thành viên"))
      .finally(() => active && setMembersLoading(false));
    return () => {
      active = false;
    };
  }, [activeTab, courseId, members, membersError]);

  // Danh sách bài tập trong khóa học
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const refreshAssignments = useCallback(async () => {
    try {
      const data = await fetchCourseAssignments(courseId);
      setAssignments(data);
    } catch {
      // Bỏ qua lỗi tải bài tập phụ
    }
  }, [courseId]);

  useEffect(() => {
    let active = true;
    fetchCourseAssignments(courseId)
      .then((data) => {
        if (active) setAssignments(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [courseId]);

  // Danh sách đề kiểm tra trong khóa học
  const [quizzes, setQuizzes] = useState<QuizDto[]>([]);
  const refreshQuizzes = useCallback(async () => {
    try {
      const data = await fetchCourseQuizzes(courseId);
      setQuizzes(data);
    } catch {
      // Bỏ qua lỗi tải đề kiểm tra phụ
    }
  }, [courseId]);

  useEffect(() => {
    let active = true;
    fetchCourseQuizzes(courseId)
      .then((data) => {
        if (active) setQuizzes(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [courseId]);

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
  // Mục đang kéo (bài học hoặc bài tập) — index tính trên danh sách gộp của topic
  const [draggedItemInfo, setDraggedItemInfo] = useState<{ moduleId: string; index: number } | null>(null);

  /** Bài học + bài tập + đề kiểm tra của topic gộp thành một danh sách để hiển thị và kéo thả */
  const moduleItems = useCallback(
    (m: ModuleDto): ModuleItem[] => {
      const items: ModuleItem[] = [
        ...(m.lessons ?? []).map((lesson) => ({ kind: "lesson" as const, id: lesson.id, order: lesson.orderIndex, lesson })),
        ...assignments
          .filter((a) => a.moduleId === m.id)
          .map((assignment) => ({ kind: "assignment" as const, id: assignment.id, order: assignment.orderIndex, assignment })),
        // Quiz không có orderIndex: xếp sau bài học/bài tập, trong nhóm quiz theo createdAt tăng dần
        ...quizzes
          .filter((quiz) => quiz.moduleId === m.id)
          .map((quiz) => ({
            kind: "quiz" as const,
            id: quiz.id,
            order: 1_000_000 + (Date.parse(quiz.createdAt) || 0),
            quiz,
          })),
      ];
      return items.sort((a, b) => a.order - b.order || ITEM_KIND_RANK[a.kind] - ITEM_KIND_RANK[b.kind]);
    },
    [assignments, quizzes],
  );

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
    if (!course?.modules) return;

    // Đang kéo một mục (bài tập / đề kiểm tra) → thả vào header topic = chuyển sang topic đó
    if (draggedItemInfo) {
      const target = course.modules[dropIndex];
      if (target) await handleItemDrop(e, target.id, 0);
      return;
    }

    if (draggedModuleIndex === null || draggedModuleIndex === dropIndex) return;

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

  const handleItemDragStart = (e: React.DragEvent, moduleId: string, index: number) => {
    e.stopPropagation();
    setDraggedItemInfo({ moduleId, index });
  };

  /**
   * Thả một mục vào topic / vị trí mới.
   * - Cùng topic: đổi thứ tự bài học & bài tập (quiz không có orderIndex nên không đổi chỗ).
   * - Khác topic: chỉ bài tập / đề kiểm tra đang DRAFT mới được chuyển.
   */
  const handleItemDrop = async (e: React.DragEvent, targetModId: string, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItemInfo || !course?.modules) return;

    const sourceMod = course.modules.find((m) => m.id === draggedItemInfo.moduleId);
    if (!sourceMod) return;

    const sourceItems = moduleItems(sourceMod);
    const movedItem = sourceItems[draggedItemInfo.index];
    if (!movedItem) return;

    if (sourceMod.id === targetModId && draggedItemInfo.index === dropIndex) {
      setDraggedItemInfo(null);
      return;
    }

    // ===== Chuyển sang topic khác =====
    if (sourceMod.id !== targetModId) {
      setDraggedItemInfo(null);

      if (movedItem.kind === "lesson") {
        showToast("Chỉ bài tập và đề kiểm tra mới có thể chuyển sang topic khác");
        return;
      }

      if (movedItem.kind === "assignment") {
        if (movedItem.assignment.status !== "DRAFT") {
          showToast("Chỉ bài tập ở trạng thái nháp mới có thể chuyển topic");
          return;
        }
        try {
          const updated = await updateAssignment(courseId, movedItem.id, { moduleId: targetModId });
          setAssignments((prev) => prev.map((a) => (a.id === movedItem.id ? { ...a, ...updated } : a)));
          showToast("Đã chuyển bài tập sang topic mới");
        } catch (err) {
          showToast((err as Error)?.message || "Không chuyển được bài tập sang topic khác");
          await refreshAssignments();
        }
        return;
      }

      if (movedItem.quiz.status !== "DRAFT") {
        showToast("Chỉ đề kiểm tra ở trạng thái nháp mới có thể chuyển topic");
        return;
      }
      try {
        const updated = await updateQuiz(courseId, movedItem.id, { moduleId: targetModId });
        setQuizzes((prev) => prev.map((q) => (q.id === movedItem.id ? { ...q, ...updated } : q)));
        showToast("Đã chuyển đề kiểm tra sang topic mới");
      } catch (err) {
        showToast(formatQuizApiError(err, "Không chuyển được đề kiểm tra sang topic khác"));
        await refreshQuizzes();
      }
      return;
    }

    // ===== Đổi thứ tự trong cùng topic =====
    if (movedItem.kind === "quiz") {
      setDraggedItemInfo(null);
      showToast("Đề kiểm tra không hỗ trợ đổi thứ tự trong cùng topic — hãy kéo sang topic khác");
      return;
    }

    const items = [...sourceItems];
    const [moved] = items.splice(draggedItemInfo.index, 1);
    items.splice(dropIndex, 0, moved);
    const reordered = items.map((item, i) => ({ ...item, order: i + 1 }));

    // Cập nhật ngay trên giao diện: bài học theo thứ tự mới, bài tập nhận orderIndex mới
    const updatedLessons = reordered
      .filter((i): i is Extract<ModuleItem, { kind: "lesson" }> => i.kind === "lesson")
      .map((i) => ({ ...i.lesson, orderIndex: i.order }));
    const assignmentOrder = new Map(
      reordered
        .filter((i): i is Extract<ModuleItem, { kind: "assignment" }> => i.kind === "assignment")
        .map((i) => [i.id, i.order]),
    );
    setCourse({
      ...course,
      modules: course.modules.map((m) => (m.id === targetModId ? { ...m, lessons: updatedLessons } : m)),
    });
    setAssignments((prev) => prev.map((a) => (assignmentOrder.has(a.id) ? { ...a, orderIndex: assignmentOrder.get(a.id)! } : a)));
    setDraggedItemInfo(null);

    try {
      await reorderModuleItems(
        targetModId,
        reordered
          .filter((i): i is Exclude<ModuleItem, { kind: "quiz" }> => i.kind !== "quiz")
          .map((i) => ({ type: i.kind === "lesson" ? ("LESSON" as const) : ("ASSIGNMENT" as const), id: i.id })),
      );
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
            const matchedLessons = mod.lessons?.some((l) => l.title.toLowerCase().includes(query));
            const matchedAssignments = assignments.some(
              (a) => a.moduleId === mod.id && a.title.toLowerCase().includes(query),
            );
            const matchedQuizzes = quizzes.some(
              (q) => q.moduleId === mod.id && q.title.toLowerCase().includes(query),
            );
            return matchedLessons || matchedAssignments || matchedQuizzes ? mod : null;
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
        onDragStart={(e) => handleItemDragStart(e, m.id, lIdx)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleItemDrop(e, m.id, lIdx)}
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

  /** Một dòng bài tập trong topic — kéo thả đổi chỗ được như bài học */
  const renderAssignment = (m: ModuleDto, assignment: AssignmentDto, idx: number) => {
    const hidden = assignment.status === "DRAFT";
    const canDrag = role === "TEACHER" && editMode && !isSearching;
    const editHref = `/teacher/content/courses/${courseId}/lessons/new?section=${assignment.moduleId}&type=ASSIGNMENT&assignmentId=${assignment.id}`;
    const viewHref = `${coursePath}/assignments/${assignment.id}`;
    const isPastDue = new Date(assignment.dueAt).getTime() < openedAt;
    // Trạng thái nộp bài của sinh viên / số bài nộp của giáo viên — hiện ngay trên trang khóa học
    const studentState = role === "STUDENT" ? submissionStateLabel(assignment.mySubmission, { isPastDue }) : null;
    const stats = assignment.submissionStats;

    return (
      <div
        key={`assignment-${assignment.id}`}
        draggable={canDrag}
        onDragStart={(e) => handleItemDragStart(e, m.id, idx)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleItemDrop(e, m.id, idx)}
        className={`group flex items-start gap-3 rounded-lg px-4 py-3.5 transition hover:bg-slate-50/80 ${hidden ? "bg-slate-50/60" : ""}`}
      >
        {canDrag && (
          <span title="Kéo thả để đổi thứ tự" className="mt-2 cursor-grab text-slate-300 hover:text-slate-600">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600 ${hidden ? "opacity-60" : ""}`}>
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className={`min-w-0 flex-1 ${hidden ? "opacity-70" : ""}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-600">Bài tập</p>
          <Link href={viewHref} className="text-[15px] font-semibold leading-snug text-[#0f6cbf] hover:underline">
            {assignment.title}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <span className={isPastDue && assignment.status === "PUBLISHED" ? "text-red-600" : ""}>
              Hạn nộp: {formatDateTime(assignment.dueAt)}
            </span>
            <span>·</span>
            <span>Điểm tối đa: {formatScore(assignment.maxScore)}</span>
            {assignment.status === "CLOSED" && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                Đã đóng
              </span>
            )}
            {role === "TEACHER" && stats && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {stats.submitted} đã nộp
                {stats.late > 0 && <span className="text-amber-700"> · {stats.late} trễ</span>}
              </span>
            )}
          </div>
          {assignment.description && (
            <RichContent
              html={assignment.description}
              className="mt-1.5 !text-[13px] text-slate-600 line-clamp-3"
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {studentState && (
            <span
              className={`inline-flex select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${SUBMISSION_BADGE[studentState.tone]}`}
            >
              {studentState.tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : studentState.tone === "warning" || studentState.tone === "danger" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {studentState.label}
            </span>
          )}
          {role === "TEACHER" && (
            <>
              {hidden && (
                <span className="inline-flex select-none items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600">
                  <EyeOff className="h-3.5 w-3.5" /> Bản nháp
                </span>
              )}

              {editMode && (
                <KebabMenu
                  items={[
                    {
                      label: "Xem bài nộp",
                      icon: Eye,
                      onClick: () => router.push(viewHref),
                    },
                    ...(assignment.status !== "CLOSED"
                      ? [
                          {
                            label: "Chỉnh sửa bài tập",
                            icon: Pencil,
                            onClick: () => router.push(editHref),
                          },
                        ]
                      : []),
                    ...(assignment.status === "DRAFT"
                      ? [
                          {
                            label: "Xuất bản bài tập",
                            icon: Eye,
                            onClick: async () => {
                              try {
                                await publishAssignment(courseId, assignment.id);
                                showToast("Đã xuất bản bài tập");
                                void refreshAssignments();
                              } catch (e) {
                                showToast((e as Error)?.message || "Không thể xuất bản");
                              }
                            },
                          },
                        ]
                      : []),
                    ...(assignment.status === "PUBLISHED"
                      ? [
                          {
                            label: "Đóng bài tập",
                            icon: EyeOff,
                            onClick: async () => {
                              try {
                                await closeAssignment(courseId, assignment.id);
                                showToast("Đã đóng bài tập");
                                void refreshAssignments();
                              } catch (e) {
                                showToast((e as Error)?.message || "Không thể đóng bài tập");
                              }
                            },
                          },
                        ]
                      : []),
                  ]}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  /** Một dòng đề kiểm tra trong topic — có thể kéo sang topic khác khi còn nháp */
  const renderQuiz = (m: ModuleDto, quiz: QuizDto, idx: number) => {
    const hidden = quiz.status === "DRAFT";
    const canDrag = role === "TEACHER" && editMode && !isSearching;
    const editHref = `/teacher/content/courses/${courseId}/lessons/new?section=${quiz.moduleId}&type=QUIZ&quizId=${quiz.id}`;
    // Giáo viên dùng chung giao diện soạn thảo cho mọi trạng thái; đề đã khóa sẽ ở chế độ chỉ xem
    const viewHref = role === "TEACHER" ? editHref : "/student/quizzes";
    const isPastDue = new Date(quiz.dueAt).getTime() < openedAt;
    const attempts = quiz.attemptStats;

    return (
      <div
        key={`quiz-${quiz.id}`}
        draggable={canDrag}
        onDragStart={(e) => handleItemDragStart(e, m.id, idx)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleItemDrop(e, m.id, idx)}
        className={`group flex items-start gap-3 rounded-lg px-4 py-3.5 transition hover:bg-slate-50/80 ${hidden ? "bg-slate-50/60" : ""}`}
      >
        {canDrag && (
          <span title="Kéo thả để chuyển topic" className="mt-2 cursor-grab text-slate-300 hover:text-slate-600">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ${hidden ? "opacity-60" : ""}`}>
          <CheckSquare className="h-5 w-5" />
        </div>
        <div className={`min-w-0 flex-1 ${hidden ? "opacity-70" : ""}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Đề kiểm tra</p>
          <Link href={viewHref} className="text-[15px] font-semibold leading-snug text-[#0f6cbf] hover:underline">
            {quiz.title}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <span className={isPastDue && quiz.status === "PUBLISHED" ? "text-red-600" : ""}>
              Hạn làm: {formatDateTime(quiz.dueAt)}
            </span>
            <span>·</span>
            <span>Tổng điểm: {formatScore(quiz.totalMaxScore)}</span>
            <span>·</span>
            <span>{quiz.questionCount} câu</span>
            {quiz.durationMinutes ? (
              <>
                <span>·</span>
                <span>{quiz.durationMinutes} phút</span>
              </>
            ) : null}
            {quiz.status === "CLOSED" && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                Đã đóng
              </span>
            )}
            {role === "TEACHER" && attempts && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {attempts.submitted}/{attempts.total} đã làm
              </span>
            )}
          </div>
          {quiz.instructions && (
            <RichContent html={quiz.instructions} className="mt-1.5 !text-[13px] text-slate-600 line-clamp-3" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {role === "TEACHER" && (
            <>
              {hidden && (
                <span className="inline-flex select-none items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600">
                  <EyeOff className="h-3.5 w-3.5" /> Bản nháp
                </span>
              )}

              {editMode && (
                <KebabMenu
                  items={[
                    {
                      label: "Chỉnh sửa đề kiểm tra",
                      icon: Pencil,
                      onClick: () => router.push(editHref),
                    },
                    ...(quiz.status === "DRAFT"
                      ? [
                          {
                            label: "Xuất bản đề kiểm tra",
                            icon: Eye,
                            onClick: async () => {
                              try {
                                await publishQuiz(courseId, quiz.id);
                                showToast("Đã xuất bản đề kiểm tra");
                                void refreshQuizzes();
                              } catch (err) {
                                showToast(formatQuizApiError(err, "Không thể xuất bản đề kiểm tra"));
                              }
                            },
                          },
                          {
                            label: "Xóa đề kiểm tra",
                            icon: Trash2,
                            danger: true,
                            onClick: async () => {
                              const ok = await confirm({
                                tone: "danger",
                                title: "Xóa đề kiểm tra?",
                                message: (
                                  <>
                                    Đề <strong className="text-slate-800">{quiz.title}</strong> sẽ bị xóa vĩnh viễn.
                                  </>
                                ),
                                confirmText: "Xóa",
                              });
                              if (!ok) return;
                              try {
                                await deleteQuiz(courseId, quiz.id);
                                showToast("Đã xóa đề kiểm tra");
                                void refreshQuizzes();
                              } catch (err) {
                                showToast(formatQuizApiError(err, "Không thể xóa đề kiểm tra"));
                              }
                            },
                          },
                        ]
                      : []),
                    ...(quiz.status === "PUBLISHED"
                      ? [
                          {
                            label: "Đóng đề kiểm tra",
                            icon: EyeOff,
                            onClick: async () => {
                              try {
                                await closeQuiz(courseId, quiz.id);
                                showToast("Đã đóng đề kiểm tra");
                                void refreshQuizzes();
                              } catch (err) {
                                showToast(formatQuizApiError(err, "Không thể đóng đề kiểm tra"));
                              }
                            },
                          },
                        ]
                      : []),
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
                        {moduleItems(m).map((item, idx) =>
                          item.kind === "lesson"
                            ? renderLesson(m, item.lesson, idx)
                            : item.kind === "assignment"
                              ? renderAssignment(m, item.assignment, idx)
                              : renderQuiz(m, item.quiz, idx),
                        )}
                        {moduleItems(m).length === 0 && (
                          <div
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleItemDrop(e, m.id, 0)}
                            className="py-6 text-center text-xs text-slate-400"
                          >
                            Chưa có nội dung trong topic này.
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Danh sách thành viên khóa học</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Danh sách giảng viên và sinh viên tham gia khóa học. Bấm vào thành viên để xem thông tin chi tiết.
                </p>
              </div>
              {members && (
                <div className="text-xs font-medium text-slate-500">
                  Tổng số: <strong className="text-slate-800">{(members.owner ? 1 : 0) + members.students.length}</strong> thành viên
                </div>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Thành viên</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Ngày tham gia</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    {isCourseOwner && <th className="px-4 py-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {membersLoading ? (
                    <tr>
                      <td colSpan={isCourseOwner ? 5 : 4} className="px-4 py-8 text-center text-sm text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[#0f6cbf]" />
                        Đang tải danh sách thành viên...
                      </td>
                    </tr>
                  ) : membersError ? (
                    <tr>
                      <td colSpan={isCourseOwner ? 5 : 4} className="px-4 py-6 text-center text-sm">
                        <p className="text-rose-600">{membersError}</p>
                        <button
                          onClick={() => setMembersError("")}
                          className="mt-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[#0f6cbf] hover:bg-blue-50 cursor-pointer"
                        >
                          Thử lại
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Giảng viên phụ trách */}
                      {members?.owner && (
                        <tr className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setViewingMember({ ...members.owner!, roleLabel: "Giảng viên" })}
                              className="flex items-center gap-3 text-left group cursor-pointer"
                            >
                              <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-200/80">
                                {members.owner.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={members.owner.avatarUrl} alt={members.owner.fullName} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full grid place-items-center bg-blue-100 text-blue-700 font-bold text-xs">
                                    {members.owner.fullName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition underline-offset-2 group-hover:underline">
                                  {members.owner.fullName}
                                </p>
                                <p className="text-xs text-slate-400">{members.owner.email}</p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                              Giảng viên
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatDate(course?.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Đang hoạt động
                            </span>
                          </td>
                          {isCourseOwner && (
                            <td className="px-4 py-3 text-right text-xs text-slate-400 italic">
                              Chủ sở hữu
                            </td>
                          )}
                        </tr>
                      )}

                      {/* Sinh viên */}
                      {members?.students.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setViewingMember({ ...s, roleLabel: "Sinh viên" })}
                              className="flex items-center gap-3 text-left group cursor-pointer"
                            >
                              <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-200/80">
                                {s.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={s.avatarUrl} alt={s.fullName} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full grid place-items-center bg-slate-100 text-slate-600 font-bold text-xs">
                                    {s.fullName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition underline-offset-2 group-hover:underline">
                                  {s.fullName}
                                </p>
                                <p className="text-xs text-slate-400">{s.email}</p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                              Sinh viên
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatDate(s.joinedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Đang hoạt động
                            </span>
                          </td>
                          {isCourseOwner && (
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setRemovingStudent(s)}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                                title={`Gỡ ${s.fullName} khỏi khóa học`}
                              >
                                <UserX className="h-3.5 w-3.5" /> Gỡ
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}

                      {!members?.owner && (members?.students.length ?? 0) === 0 && (
                        <tr>
                          <td colSpan={isCourseOwner ? 5 : 4} className="px-4 py-8 text-center text-sm text-slate-400">
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
      {moduleModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs">
            <button
              type="button"
              aria-label="Đóng"
              tabIndex={-1}
              onClick={() => setModuleModalOpen(false)}
              className="fixed inset-0 cursor-default"
            />
            <div className="relative my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
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
          </div>,
          document.body,
        )}

      <DocumentPreview
        isOpen={!!previewResource}
        resourceId={previewResource?.id ?? null}
        initialFileName={previewResource?.fileName}
        initialFileSize={previewResource?.fileSizeBytes}
        initialMimeType={previewResource?.mimeType}
        onClose={() => setPreviewResource(null)}
      />

      {/* Modal xem nhanh thông tin thành viên (style chuẩn thẻ Profile cá nhân) */}
      {viewingMember &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setViewingMember(null)}
          >
            <div
              className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Banner gradient phía trên */}
            <div className="relative h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500">
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/20 text-white backdrop-blur hover:bg-black/40 transition cursor-pointer"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nội dung hồ sơ */}
            <div className="px-6 pb-6 pt-0">
              {/* Avatar vòng tròn có viền trắng đè lên banner */}
              <div className="relative -mt-12 flex items-end justify-between">
                <div className="h-24 w-24 overflow-hidden rounded-full bg-slate-200 ring-4 ring-white shadow-md">
                  {viewingMember.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewingMember.avatarUrl}
                      alt={viewingMember.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center bg-blue-100 text-blue-700 text-2xl font-bold">
                      {viewingMember.fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Tên & Badges */}
              <div className="mt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    {viewingMember.fullName}
                  </h3>
                  <span className="inline-flex items-center rounded-md bg-blue-100/80 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {viewingMember.roleLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Đang hoạt động
                  </span>
                </div>

                <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-700 select-all">
                      {viewingMember.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-600">
                      Tham gia:{" "}
                      <span className="font-medium text-slate-800">
                        {formatDate(viewingMember.joinedAt || course?.createdAt)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút đóng */}
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingMember(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Dialog xác nhận gỡ học sinh khỏi khóa học */}
      {removingStudent &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
              role="alertdialog"
              aria-modal="true"
            >
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Gỡ học sinh khỏi khóa học?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Bạn có chắc chắn muốn gỡ{" "}
                  <strong className="text-slate-900 font-semibold">
                    {removingStudent.fullName}
                  </strong>{" "}
                  (<span className="text-slate-500">{removingStudent.email}</span>) khỏi khóa học này?
                </p>

                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-800">
                  ⚠️ <strong>Lưu ý:</strong> Toàn bộ bài nộp và điểm số trước đó sẽ được giữ lại. Học sinh có thể tham gia lại bất kỳ lúc nào bằng mã khóa học.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={removingLoading}
                onClick={() => setRemovingStudent(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={removingLoading}
                onClick={handleConfirmRemove}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
              >
                {removingLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang gỡ...
                  </>
                ) : (
                  <>
                    <UserX className="h-3.5 w-3.5" />
                    Gỡ học sinh
                  </>
                )}
              </button>
            </div>
            </div>
          </div>,
          document.body,
        )}
    </CourseShell>
  );
}
