"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Clock,
  FileEdit,
  FileText,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Lock,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import Modal from "../components/Modal";
import {
  FilterSelect,
  Pagination,
  RowMenu,
  TONE_BOX,
} from "../components/work-shared";
import { fetchTeacherCourses } from "@/lib/api/course-api";
import { fetchCourseContent } from "@/lib/api/learning-content-api";
import {
  closeAssignment,
  createAssignment,
  fetchCourseAssignments,
  formatAssignmentApiError,
  publishAssignment,
  updateAssignment,
} from "@/lib/api/assignment-api";
import type { CourseDto } from "@/lib/types/course";
import type { AssignmentDto } from "@/lib/types/assignment";
import RichContent from "@/components/content/RichContent";

type ToneColor = "red" | "orange" | "blue" | "green" | "purple";
const TONES: ToneColor[] = ["blue", "green", "purple", "orange", "red"];

export interface TeacherAssignmentViewItem extends AssignmentDto {
  courseCode: string;
  courseName: string;
  moduleTitle?: string;
  studentCount: number;
  tone: ToneColor;
}

const STATUS_FILTER_OPTIONS = [
  "Tất cả trạng thái",
  "Bản nháp",
  "Đang mở",
  "Sắp đến hạn",
  "Đã đóng",
];

const SORT_OPTIONS = ["Mới tạo gần nhất", "Hạn nộp gần nhất", "Điểm tối đa cao nhất"];

function toDatetimeLocalValue(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultOpenAtLocal(): string {
  return toDatetimeLocalValue(new Date().toISOString());
}

function defaultDueAtLocal(): string {
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  due.setHours(23, 59, 0, 0);
  return toDatetimeLocalValue(due.toISOString());
}

function formatDateTimeVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isDueSoon(item: AssignmentDto): boolean {
  if (item.status !== "PUBLISHED") return false;
  const dueMs = new Date(item.dueAt).getTime();
  const nowMs = Date.now();
  const diffDays = (dueMs - nowMs) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

function AssignmentLifecycleBadge({ item }: { item: AssignmentDto }) {
  if (item.status === "DRAFT") {
    return (
      <span className="inline-block shrink-0 whitespace-nowrap rounded-lg bg-amber-100/80 px-3 py-1 text-[12.5px] font-medium text-amber-700">
        Bản nháp
      </span>
    );
  }
  if (item.status === "CLOSED") {
    return (
      <span className="inline-block shrink-0 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1 text-[12.5px] font-medium text-slate-500">
        Đã đóng
      </span>
    );
  }
  if (isDueSoon(item)) {
    return (
      <span className="inline-block shrink-0 whitespace-nowrap rounded-lg bg-orange-100/80 px-3 py-1 text-[12.5px] font-medium text-orange-600">
        Sắp đến hạn
      </span>
    );
  }
  return (
    <span className="inline-block shrink-0 whitespace-nowrap rounded-lg bg-green-100/80 px-3 py-1 text-[12.5px] font-medium text-green-700">
      Đang mở
    </span>
  );
}

interface AssignmentFormSubmitValues {
  courseId: string;
  moduleId: string;
  title: string;
  description?: string;
  maxScore: number;
  openAt: string;
  dueAt: string;
  publishImmediately: boolean;
}

function AssignmentForm({
  courses,
  initial,
  defaultCourseId,
  defaultModuleId,
  submitting,
  serverError,
  onClose,
  onSubmit,
}: {
  courses: CourseDto[];
  initial?: TeacherAssignmentViewItem | null;
  defaultCourseId?: string;
  defaultModuleId?: string;
  submitting: boolean;
  serverError: string;
  onClose: () => void;
  onSubmit: (v: AssignmentFormSubmitValues) => Promise<void>;
}) {
  const [courseId, setCourseId] = useState<string>(
    initial?.courseId ?? defaultCourseId ?? courses[0]?.id ?? "",
  );
  const [moduleId, setModuleId] = useState<string>(
    initial?.moduleId ?? defaultModuleId ?? "",
  );
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [loadingModules, setLoadingModules] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [desc, setDesc] = useState<string>(initial?.description ?? "");
  // maxScore từ backend là string ("10.00") -> chuyển về number hiển thị gọn trên input
  const [maxScoreInput, setMaxScoreInput] = useState<string>(() => {
    if (!initial?.maxScore) return "10";
    const parsed = Number(initial.maxScore);
    return Number.isFinite(parsed) ? String(parsed) : initial.maxScore;
  });
  const [openAt, setOpenAt] = useState<string>(() =>
    initial?.openAt ? toDatetimeLocalValue(initial.openAt) : defaultOpenAtLocal(),
  );
  const [dueAt, setDueAt] = useState<string>(() =>
    initial?.dueAt ? toDatetimeLocalValue(initial.dueAt) : defaultDueAtLocal(),
  );
  const [localError, setLocalError] = useState<string>("");

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setLoadingModules(true);
    });
    fetchCourseContent(courseId)
      .then((content) => {
        if (!active) return;
        const loaded = content.modules || [];
        setModules(loaded.map((m) => ({ id: m.id, title: m.title })));
        setModuleId((prev) => {
          if (prev && loaded.some((m) => m.id === prev)) return prev;
          if (defaultModuleId && loaded.some((m) => m.id === defaultModuleId)) {
            return defaultModuleId;
          }
          return loaded[0]?.id ?? "";
        });
      })
      .catch(() => {
        if (!active) return;
        setModules([]);
        setModuleId("");
      })
      .finally(() => {
        if (active) setLoadingModules(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, defaultModuleId]);

  const handleSave = async (publishImmediately: boolean) => {
    setLocalError("");
    if (!courseId) {
      setLocalError("Vui lòng chọn khóa học cho bài tập.");
      return;
    }
    if (!moduleId) {
      setLocalError("Vui lòng chọn chủ đề (topic) cho bài tập.");
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setLocalError("Tiêu đề bài tập không được để trống.");
      return;
    }
    if (trimmedTitle.length > 255) {
      setLocalError("Tiêu đề bài tập không được vượt quá 255 ký tự.");
      return;
    }

    const parsedScore = Number(maxScoreInput.trim());
    if (!Number.isFinite(parsedScore) || parsedScore < 0.01) {
      setLocalError("Điểm tối đa phải là số lớn hơn hoặc bằng 0.01.");
      return;
    }

    const openDate = new Date(openAt);
    const dueDate = new Date(dueAt);
    if (Number.isNaN(openDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      setLocalError("Vui lòng nhập đầy đủ thời gian mở và hạn nộp bài tập.");
      return;
    }
    if (dueDate <= openDate) {
      setLocalError("Hạn nộp phải lớn hơn thời gian mở bài tập.");
      return;
    }

    await onSubmit({
      courseId,
      moduleId,
      title: trimmedTitle,
      description: desc.trim() || undefined,
      maxScore: parsedScore,
      openAt: openDate.toISOString(),
      dueAt: dueDate.toISOString(),
      publishImmediately,
    });
  };

  const displayError = localError || serverError;

  return (
    <div className="space-y-3.5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          Khóa học *
        </label>
        {initial ? (
          <input
            disabled
            value={`${initial.courseCode} — ${initial.courseName}`}
            className="h-11 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-600"
          />
        ) : (
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={submitting || courses.length === 0}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode} — {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          Chủ đề (Topic) *
        </label>
        {loadingModules ? (
          <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Đang tải danh sách chủ đề...</span>
          </div>
        ) : modules.length === 0 ? (
          <div className="flex h-11 items-center rounded-lg border border-amber-200 bg-amber-50 px-3.5 text-xs text-amber-700">
            Khóa học này chưa có chủ đề nào. Vui lòng tạo chủ đề trong khóa học trước.
          </div>
        ) : (
          <select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          Tên bài tập *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          placeholder="VD: Bài tập lớn số 1: Xây dựng REST API"
          className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          Mô tả hướng dẫn
        </label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          disabled={submitting}
          rows={3}
          placeholder="Mô tả yêu cầu, định dạng nộp bài và tiêu chí chấm điểm..."
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            Điểm tối đa *
          </label>
          <input
            type="number"
            step="any"
            min="0.01"
            value={maxScoreInput}
            onChange={(e) => setMaxScoreInput(e.target.value)}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            Thời gian mở *
          </label>
          <input
            type="datetime-local"
            value={openAt}
            onChange={(e) => setOpenAt(e.target.value)}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            Hạn nộp *
          </label>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {displayError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          Hủy
        </button>

        {initial ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSave(false)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSave(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu bản nháp
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSave(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Tạo & Xuất bản ngay
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TeacherAssignmentsContent() {
  const searchParams = useSearchParams();
  const urlCourseId = searchParams.get("courseId") ?? undefined;
  const urlModuleId = searchParams.get("moduleId") ?? undefined;
  const urlAction = searchParams.get("action") ?? undefined;

  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("Tất cả khóa học");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_OPTIONS[0]);
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [items, setItems] = useState<TeacherAssignmentViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [createOpen, setCreateOpen] = useState(() => urlAction === "create");
  const [editing, setEditing] = useState<TeacherAssignmentViewItem | null>(null);
  const [detail, setDetail] = useState<TeacherAssignmentViewItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState("");

  const [toast, setToast] = useState("");
  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 3000);
  }, []);

  const resetPage = () => setPage(1);

  const fetchBundle = useCallback(async () => {
    const courseRes = await fetchTeacherCourses({ status: "all", limit: 50 });
    const activeOrClosedCourses = courseRes.items.filter(
      (c) => c.status !== "ARCHIVED",
    );

    const perCourseLists = await Promise.all(
      courseRes.items.map(async (course) => {
        const [list, content] = await Promise.all([
          fetchCourseAssignments(course.id),
          fetchCourseContent(course.id).catch(() => null),
        ]);
        const moduleMap = new Map(
          (content?.modules ?? []).map((m) => [m.id, m.title]),
        );
        return list.map((a, idx) => ({
          ...a,
          courseCode: course.courseCode,
          courseName: course.name,
          moduleTitle: a.moduleId ? moduleMap.get(a.moduleId) : undefined,
          studentCount: course._count?.enrollments ?? 0,
          tone: TONES[idx % TONES.length],
        }));
      }),
    );

    const merged = perCourseLists
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((item, idx) => ({
        ...item,
        tone: TONES[idx % TONES.length],
      }));

    return { activeOrClosedCourses, merged };
  }, []);

  const loadAllAssignments = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { activeOrClosedCourses, merged } = await fetchBundle();
      setCourses(activeOrClosedCourses);
      setItems(merged);
    } catch (err) {
      setLoadError(
        formatAssignmentApiError(
          err,
          "Không thể tải danh sách bài tập từ máy chủ.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [fetchBundle]);

  useEffect(() => {
    let active = true;
    fetchBundle()
      .then(({ activeOrClosedCourses, merged }) => {
        if (!active) return;
        setCourses(activeOrClosedCourses);
        setItems(merged);
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          formatAssignmentApiError(
            err,
            "Không thể tải danh sách bài tập từ máy chủ.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchBundle]);

  const courseFilterOptions = useMemo(() => {
    const dynamicOptions = courses.map((c) => `${c.courseCode} — ${c.name}`);
    return ["Tất cả khóa học", ...dynamicOptions];
  }, [courses]);

  const stats = useMemo(
    () => ({
      total: items.length,
      draft: items.filter((i) => i.status === "DRAFT").length,
      open: items.filter((i) => i.status === "PUBLISHED").length,
      closed: items.filter((i) => i.status === "CLOSED").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...items];

    if (courseFilter !== "Tất cả khóa học") {
      list = list.filter(
        (i) => `${i.courseCode} — ${i.courseName}` === courseFilter,
      );
    }

    if (statusFilter !== "Tất cả trạng thái") {
      if (statusFilter === "Bản nháp") {
        list = list.filter((i) => i.status === "DRAFT");
      } else if (statusFilter === "Đang mở") {
        list = list.filter((i) => i.status === "PUBLISHED");
      } else if (statusFilter === "Sắp đến hạn") {
        list = list.filter((i) => isDueSoon(i));
      } else if (statusFilter === "Đã đóng") {
        list = list.filter((i) => i.status === "CLOSED");
      }
    }

    if (q) {
      list = list.filter((i) =>
        `${i.title} ${i.description ?? ""} ${i.courseCode} ${i.courseName}`
          .toLowerCase()
          .includes(q),
      );
    }

    if (sort === "Hạn nộp gần nhất") {
      list.sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      );
    } else if (sort === "Điểm tối đa cao nhất") {
      list.sort((a, b) => Number(b.maxScore) - Number(a.maxScore));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return list;
  }, [items, courseFilter, statusFilter, query, topSearch, sort]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  const handleSubmitForm = async (v: AssignmentFormSubmitValues) => {
    setSubmitting(true);
    setFormServerError("");
    try {
      const content = await fetchCourseContent(v.courseId).catch(() => null);
      const moduleTitle = content?.modules.find((m) => m.id === v.moduleId)?.title;

      if (editing) {
        const updated = await updateAssignment(editing.courseId, editing.id, {
          moduleId: v.moduleId,
          title: v.title,
          description: v.description,
          maxScore: v.maxScore,
          openAt: v.openAt,
          dueAt: v.dueAt,
        });
        setItems((prev) =>
          prev.map((item) =>
            item.id === editing.id
              ? {
                  ...item,
                  ...updated,
                  moduleId: v.moduleId,
                  moduleTitle: moduleTitle ?? item.moduleTitle,
                }
              : item,
          ),
        );
        showToast("Đã cập nhật bài tập thành công");
        setEditing(null);
        setCreateOpen(false);
      } else {
        const created = await createAssignment(v.courseId, {
          moduleId: v.moduleId,
          title: v.title,
          description: v.description,
          maxScore: v.maxScore,
          openAt: v.openAt,
          dueAt: v.dueAt,
        });

        let finalAssignment = created;
        if (v.publishImmediately) {
          finalAssignment = await publishAssignment(v.courseId, created.id);
        }

        const targetCourse = courses.find((c) => c.id === v.courseId);
        const newItem: TeacherAssignmentViewItem = {
          ...finalAssignment,
          moduleId: v.moduleId,
          moduleTitle,
          courseCode: targetCourse?.courseCode ?? "",
          courseName: targetCourse?.name ?? "",
          studentCount: targetCourse?._count?.enrollments ?? 0,
          tone: TONES[items.length % TONES.length],
        };

        setItems((prev) => [newItem, ...prev]);
        showToast(
          v.publishImmediately
            ? "Đã tạo và xuất bản bài tập thành công"
            : "Đã lưu bài tập ở trạng thái bản nháp",
        );
        setCreateOpen(false);
      }
    } catch (err) {
      setFormServerError(
        formatAssignmentApiError(err, "Không thể lưu thông tin bài tập."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (it: TeacherAssignmentViewItem) => {
    try {
      const updated = await publishAssignment(it.courseId, it.id);
      setItems((prev) =>
        prev.map((x) => (x.id === it.id ? { ...x, ...updated } : x)),
      );
      if (detail?.id === it.id) {
        setDetail((prev) => (prev ? { ...prev, ...updated } : null));
      }
      showToast("Đã xuất bản bài tập cho sinh viên");
    } catch (err) {
      showToast(
        formatAssignmentApiError(err, "Không thể xuất bản bài tập này."),
      );
    }
  };

  const handleClose = async (it: TeacherAssignmentViewItem) => {
    try {
      const updated = await closeAssignment(it.courseId, it.id);
      setItems((prev) =>
        prev.map((x) => (x.id === it.id ? { ...x, ...updated } : x)),
      );
      if (detail?.id === it.id) {
        setDetail((prev) => (prev ? { ...prev, ...updated } : null));
      }
      showToast("Đã đóng nhận bài cho bài tập này");
    } catch (err) {
      showToast(formatAssignmentApiError(err, "Không thể đóng bài tập này."));
    }
  };

  const statCards = [
    {
      label: "Tổng bài tập",
      value: stats.total,
      icon: FileText,
      cls: "bg-blue-50 text-blue-600",
    },
    {
      label: "Bản nháp (DRAFT)",
      value: stats.draft,
      icon: FileEdit,
      cls: "bg-amber-50 text-amber-600",
    },
    {
      label: "Đang mở (PUBLISHED)",
      value: stats.open,
      icon: Play,
      cls: "bg-green-50 text-green-600",
    },
    {
      label: "Đã đóng (CLOSED)",
      value: stats.closed,
      icon: Lock,
      cls: "bg-slate-100 text-slate-600",
    },
  ];

  const buildRowActions = (it: TeacherAssignmentViewItem) => {
    const actions: { label: string; danger?: boolean; onClick: () => void }[] = [
      { label: "Xem chi tiết", onClick: () => setDetail(it) },
    ];
    if (it.status === "DRAFT") {
      actions.push({
        label: "Chỉnh sửa",
        onClick: () => {
          setFormServerError("");
          setEditing(it);
          setCreateOpen(true);
        },
      });
      actions.push({
        label: "Xuất bản bài tập",
        onClick: () => void handlePublish(it),
      });
    } else if (it.status === "PUBLISHED") {
      actions.push({
        label: "Đóng bài tập",
        danger: true,
        onClick: () => void handleClose(it),
      });
    }
    return actions;
  };

  return (
    <TeacherShell
      activeId="assignments"
      searchPlaceholder="Tìm kiếm khóa học, bài tập..."
      searchValue={topSearch}
      onSearchChange={(v) => {
        setTopSearch(v);
        resetPage();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Bài tập</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">
            Tạo và quản lý bài tập cho các khóa học của bạn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAllAssignments()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
          <button
            type="button"
            disabled={courses.length === 0}
            onClick={() => {
              setFormServerError("");
              setEditing(null);
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Tạo bài tập
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4"
          >
            <span
              className={`grid h-12 w-12 place-items-center rounded-xl ${s.cls}`}
            >
              <s.icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-[13px] text-slate-500">
                {s.label}
              </span>
              <span className="block text-[22px] font-extrabold">
                {s.value}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200/70 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1.4fr_auto]">
          <FilterSelect
            label="Khóa học"
            value={courseFilter}
            onChange={(v) => {
              setCourseFilter(v);
              resetPage();
            }}
            options={courseFilterOptions}
          />
          <FilterSelect
            label="Trạng thái"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              resetPage();
            }}
            options={STATUS_FILTER_OPTIONS}
          />
          <label className="block text-[12.5px] text-slate-500">
            <span className="mb-1 block">&nbsp;</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetPage();
                }}
                placeholder="Tìm kiếm bài tập theo tên, mô tả hoặc mã khóa học..."
                className="h-10 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </span>
          </label>
          <label className="block text-[12.5px] text-slate-500">
            <span className="mb-1 block">&nbsp;</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  Sắp xếp: {o}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loadError && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadAllAssignments()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-12 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Đang tải danh sách bài tập từ cơ sở dữ liệu...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Bạn chưa có khóa học nào đang hoạt động. Vui lòng tạo khóa học trước khi giao bài tập.
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {pageItems.map((it) => (
                <li
                  key={it.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 p-3.5 transition hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 sm:flex-nowrap sm:gap-4"
                >
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${TONE_BOX[it.tone]}`}
                  >
                    <FileText className="h-6 w-6" />
                  </span>

                  <span className="min-w-[200px] flex-[1.5]">
                    <span className="block text-[14.5px] font-bold text-slate-900">
                      {it.title}
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-slate-500">
                      {it.description
                        ? it.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "Không có mô tả."
                        : "Không có mô tả."}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-slate-500">
                      <span>
                        Khóa học: <b className="font-semibold text-slate-700">{it.courseCode}</b> — {it.courseName}
                      </span>
                      {it.moduleTitle && (
                        <span>
                          • Chủ đề: <b className="font-semibold text-slate-700">{it.moduleTitle}</b>
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="flex w-[150px] shrink-0 flex-col items-center py-0.5 text-center">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="mt-1 whitespace-nowrap text-[11.5px] leading-tight text-slate-400">
                      Thời gian mở
                    </span>
                    <b className="whitespace-nowrap text-[12.5px] font-semibold leading-snug text-slate-700">
                      {formatDateTimeVi(it.openAt)}
                    </b>
                  </span>

                  <span className="flex w-[150px] shrink-0 flex-col items-center py-0.5 text-center">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span className="mt-1 whitespace-nowrap text-[11.5px] leading-tight text-slate-400">
                      Hạn nộp
                    </span>
                    <b className="whitespace-nowrap text-[12.5px] font-semibold leading-snug text-slate-700">
                      {formatDateTimeVi(it.dueAt)}
                    </b>
                  </span>

                  <span className="flex w-[100px] shrink-0 flex-col items-center py-0.5 text-center">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="mt-1 whitespace-nowrap text-[11.5px] leading-tight text-slate-400">
                      Điểm tối đa
                    </span>
                    <b className="whitespace-nowrap text-[13px] font-semibold leading-snug text-slate-700">
                      {it.maxScore}
                    </b>
                  </span>

                  <span className="flex w-[115px] shrink-0 justify-center">
                    <AssignmentLifecycleBadge item={it} />
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <RowMenu items={buildRowActions(it)} />
                    {it.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => void handlePublish(it)}
                        className="whitespace-nowrap rounded-lg bg-emerald-600 px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-emerald-700"
                      >
                        Xuất bản
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDetail(it)}
                        className="whitespace-nowrap rounded-lg border border-blue-200 px-3.5 py-2 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Xem chi tiết
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {filtered.length === 0 && (
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chưa có bài tập nào khớp bộ lọc hiện tại.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-500">
              <span>
                Hiển thị {from} - {to} trong {filtered.length} bài tập
              </span>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!submitting) {
            setCreateOpen(false);
            setEditing(null);
            setFormServerError("");
          }
        }}
        title={
          editing ? "Chỉnh sửa bài tập (Bản nháp)" : "Tạo bài tập mới"
        }
      >
        <AssignmentForm
          key={
            editing
              ? editing.id
              : `create-${urlCourseId || ""}-${urlModuleId || ""}-${createOpen}`
          }
          courses={courses}
          initial={editing}
          defaultCourseId={urlCourseId}
          defaultModuleId={urlModuleId}
          submitting={submitting}
          serverError={formServerError}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
            setFormServerError("");
          }}
          onSubmit={handleSubmitForm}
        />
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Chi tiết bài tập"
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[16px] font-bold text-slate-900">
                  {detail.title}
                </p>
                <p className="mt-0.5 text-slate-500">
                  Khóa học: <b>{detail.courseCode}</b> — {detail.courseName}
                </p>
                {detail.moduleTitle && (
                  <p className="mt-0.5 text-slate-500">
                    Chủ đề: <b>{detail.moduleTitle}</b>
                  </p>
                )}
              </div>
              <AssignmentLifecycleBadge item={detail} />
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-slate-700">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">
                Mô tả bài tập
              </p>
              {detail.description ? (
                <RichContent html={detail.description} className="!text-[13.5px] text-slate-700" />
              ) : (
                <p className="text-slate-400 italic">Không có mô tả chi tiết.</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Thời gian mở</p>
                <p className="mt-0.5 font-bold text-slate-800">
                  {formatDateTimeVi(detail.openAt)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Hạn nộp</p>
                <p className="mt-0.5 font-bold text-slate-800">
                  {formatDateTimeVi(detail.dueAt)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Điểm tối đa</p>
                <p className="mt-0.5 font-bold text-slate-800">
                  {detail.maxScore}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {detail.status === "DRAFT" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = detail;
                      setDetail(null);
                      setFormServerError("");
                      setEditing(target);
                      setCreateOpen(true);
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = detail;
                      setDetail(null);
                      void handlePublish(target);
                    }}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700"
                  >
                    Xuất bản ngay
                  </button>
                </>
              )}

              {detail.status === "PUBLISHED" && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detail;
                    setDetail(null);
                    void handleClose(target);
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 font-semibold text-red-600 hover:bg-red-100"
                >
                  Đóng bài tập
                </button>
              )}

              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toast} />
    </TeacherShell>
  );
}

export default function TeacherAssignmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <TeacherAssignmentsContent />
    </Suspense>
  );
}
