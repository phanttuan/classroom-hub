"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckSquare,
  Clock,
  FileText,
  ListChecks,
  Loader2,
  Play,
  Plus,
  Search,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import Modal from "../components/Modal";
import { RowMenu, SubmitProgress } from "../components/work-shared";
import { fetchTeacherCourses } from "@/lib/api/course-api";
import { fetchCourseContent } from "@/lib/api/learning-content-api";
import {
  closeQuiz,
  deleteQuiz,
  fetchCourseQuizzes,
  fetchQuizDetail,
  formatQuizApiError,
  publishQuiz,
} from "@/lib/api/quiz-api";
import type { CourseDto } from "@/lib/types/course";
import type { QuizDto, QuizStatus } from "@/lib/types/quiz";

interface QuizRow extends QuizDto {
  courseCode: string;
  courseName: string;
  moduleTitle: string;
}

interface ModuleOption {
  id: string;
  title: string;
}

const STATUS_META: Record<QuizStatus, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "bg-amber-100/80 text-amber-700" },
  PUBLISHED: { label: "Đã xuất bản", className: "bg-green-100/80 text-green-700" },
  CLOSED: { label: "Đã đóng", className: "bg-slate-100 text-slate-500" },
};

const STATUS_FILTERS: Array<{ value: "ALL" | QuizStatus; label: string }> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
  { value: "CLOSED", label: "Đã đóng" },
];

function stripHtml(html?: string | null): string {
  return (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function QuizStatusBadge({ status }: { status: QuizStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-block shrink-0 whitespace-nowrap rounded-lg px-3 py-1 text-[12.5px] font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default function TeacherQuizzesPage() {
  const router = useRouter();
  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | QuizStatus>("ALL");
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, ModuleOption[]>>({});
  const [items, setItems] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createCourseId, setCreateCourseId] = useState("");
  const [createModuleId, setCreateModuleId] = useState("");
  const [detail, setDetail] = useState<QuizRow | null>(null);
  const [detailData, setDetailData] = useState<QuizDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState<QuizRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    let active = true;
    // Đẩy setState sang microtask để tránh render dây chuyền ngay trong effect
    void Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setLoadError("");
    });

    fetchTeacherCourses({ limit: 100 })
      .then(async (res) => {
        if (!active) return;
        const courseItems = res.items ?? [];
        setCourses(courseItems);

        const settled = await Promise.allSettled(
          courseItems.map(async (course) => {
            const [quizResult, contentResult] = await Promise.allSettled([
              fetchCourseQuizzes(course.id),
              fetchCourseContent(course.id),
            ]);

            if (quizResult.status === "rejected") throw quizResult.reason;

            const modules: ModuleOption[] =
              contentResult.status === "fulfilled"
                ? contentResult.value.modules.map((module) => ({ id: module.id, title: module.title }))
                : [];
            const moduleTitleById = new Map(modules.map((module) => [module.id, module.title]));
            const rows: QuizRow[] = quizResult.value.map((quiz) => ({
              ...quiz,
              courseCode: course.courseCode,
              courseName: course.name,
              moduleTitle: moduleTitleById.get(quiz.moduleId) ?? "—",
            }));

            return { courseId: course.id, modules, rows };
          }),
        );

        if (!active) return;

        const nextRows: QuizRow[] = [];
        const nextModules: Record<string, ModuleOption[]> = {};
        let firstError = "";
        for (const result of settled) {
          if (result.status === "fulfilled") {
            nextRows.push(...result.value.rows);
            nextModules[result.value.courseId] = result.value.modules;
          } else if (!firstError) {
            firstError = formatQuizApiError(result.reason, "Không tải được danh sách đề kiểm tra");
          }
        }

        setItems(nextRows);
        setModulesByCourse(nextModules);
        if (firstError) setLoadError(firstError);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(formatQuizApiError(err, "Không tải được danh sách đề kiểm tra"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: items.length,
      draft: items.filter((item) => item.status === "DRAFT").length,
      published: items.filter((item) => item.status === "PUBLISHED").length,
      closed: items.filter((item) => item.status === "CLOSED").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const keyword = (query || topSearch).trim().toLowerCase();
    return items.filter((item) => {
      if (courseFilter !== "ALL" && item.courseId !== courseFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!keyword) return true;
      return `${item.title} ${stripHtml(item.instructions)} ${item.courseCode} ${item.courseName} ${item.moduleTitle}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [items, courseFilter, statusFilter, query, topSearch]);

  const courseFilterOptions = useMemo(
    () => [
      { value: "ALL", label: "Tất cả khóa học" },
      ...courses.map((course) => ({ value: course.id, label: `${course.courseCode} — ${course.name}` })),
    ],
    [courses],
  );

  const createModules = modulesByCourse[createCourseId] ?? [];

  const openCreate = () => {
    const courseId = createCourseId || courses[0]?.id || "";
    const modules = modulesByCourse[courseId] ?? [];
    setCreateCourseId(courseId);
    setCreateModuleId(modules[0]?.id ?? "");
    setCreateOpen(true);
  };

  const openDetail = useCallback(
    async (row: QuizRow) => {
      setDetail(row);
      setDetailData(null);
      setDetailLoading(true);
      try {
        const data = await fetchQuizDetail(row.courseId, row.id);
        setDetailData(data);
      } catch (err) {
        showToast(formatQuizApiError(err, "Không tải được chi tiết đề kiểm tra"));
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast],
  );

  // Hỗ trợ link từ trình soạn thảo: /teacher/quizzes?quiz=<id>
  const openedFromQuery = useRef(false);
  useEffect(() => {
    if (loading || openedFromQuery.current) return;
    const quizId = new URLSearchParams(window.location.search).get("quiz");
    if (!quizId) return;
    const row = items.find((item) => item.id === quizId);
    if (!row) return;
    openedFromQuery.current = true;
    void Promise.resolve().then(() => openDetail(row));
  }, [loading, items, openDetail]);

  const replaceRow = (updated: QuizDto) => {
    setItems((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
  };

  const handlePublish = async (row: QuizRow) => {
    setBusyId(row.id);
    try {
      const updated = await publishQuiz(row.courseId, row.id);
      replaceRow(updated);
      showToast("Đã xuất bản đề kiểm tra và chốt điểm vào sổ điểm");
    } catch (err) {
      showToast(formatQuizApiError(err, "Không xuất bản được đề kiểm tra"));
    } finally {
      setBusyId(null);
    }
  };

  const handleClose = async (row: QuizRow) => {
    setBusyId(row.id);
    try {
      const updated = await closeQuiz(row.courseId, row.id);
      replaceRow(updated);
      showToast("Đã đóng đề kiểm tra");
    } catch (err) {
      showToast(formatQuizApiError(err, "Không đóng được đề kiểm tra"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await deleteQuiz(deleting.courseId, deleting.id);
      setItems((prev) => prev.filter((row) => row.id !== deleting.id));
      setDeleting(null);
      showToast("Đã xóa đề kiểm tra");
    } catch (err) {
      showToast(formatQuizApiError(err, "Không xóa được đề kiểm tra"));
    } finally {
      setBusyId(null);
    }
  };

  const goToEditor = (row: QuizRow) => {
    router.push(
      `/teacher/content/courses/${row.courseId}/lessons/new?section=${row.moduleId}&type=QUIZ&quizId=${row.id}`,
    );
  };

  const statCards = [
    { label: "Tổng đề kiểm tra", value: stats.total, icon: ListChecks, cls: "bg-purple-50 text-purple-600" },
    { label: "Bản nháp", value: stats.draft, icon: FileText, cls: "bg-amber-50 text-amber-600" },
    { label: "Đã xuất bản", value: stats.published, icon: Play, cls: "bg-green-50 text-green-600" },
    { label: "Đã đóng", value: stats.closed, icon: Clock, cls: "bg-red-50 text-red-500" },
  ];

  const detailQuiz = detailData ?? detail;
  const detailQuestions = detailQuiz?.questions ?? [];
  const detailTotal = detailQuiz?.totalMaxScore ?? "0";

  return (
    <TeacherShell
      activeId="quizzes"
      searchPlaceholder="Tìm kiếm khóa học, bài tập, kiểm tra..."
      searchValue={topSearch}
      onSearchChange={setTopSearch}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Kiểm tra trắc nghiệm</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">
            Tạo và quản lý các bài kiểm tra trắc nghiệm cho các khóa học của bạn
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={loading || courses.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Tạo bài kiểm tra
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${stat.cls}`}>
              <stat.icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-[13px] text-slate-500">{stat.label}</span>
              <span className="block text-[22px] font-extrabold">{stat.value}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200/70 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-[1.2fr_1fr_1.6fr]">
          <label className="block text-[12.5px] text-slate-500">
            <span className="mb-1 block">Khóa học</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-blue-300"
            >
              {courseFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[12.5px] text-slate-500">
            <span className="mb-1 block">Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | QuizStatus)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-blue-300"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 block text-[12.5px] text-slate-500 xl:col-span-1">
            <span className="mb-1 block">&nbsp;</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm bài kiểm tra..."
                className="h-10 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </span>
          </label>
        </div>

        {loadError && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
          </p>
        )}

        {loading ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-10 text-[13.5px] text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#0f6cbf]" /> Đang tải danh sách đề kiểm tra...
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {filtered.map((item) => {
                const attempts = item.attemptStats ?? { submitted: 0, total: 0 };
                const busy = busyId === item.id;
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 p-3.5 transition hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 sm:flex-nowrap sm:gap-4"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
                      <CheckSquare className="h-6 w-6" />
                    </span>
                    <span className="min-w-[200px] flex-[1.4]">
                      <span className="block text-[14.5px] font-bold">{item.title}</span>
                      <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-slate-500">
                        {stripHtml(item.instructions) || "Chưa có hướng dẫn làm bài."}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-slate-500">
                        <span>Khóa học: {item.courseCode}</span>
                        <span>Topic: {item.moduleTitle}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] sm:w-[165px]">
                      <ListChecks className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        <span className="block leading-snug">
                          <span className="text-slate-400">Số câu: </span>
                          <b className="font-semibold text-slate-700">{item.questionCount}</b>
                        </span>
                        <span className="block leading-snug">
                          <span className="text-slate-400">Tổng điểm: </span>
                          <b className="font-semibold text-slate-700">{item.totalMaxScore}</b>
                        </span>
                        <span className="block leading-snug">
                          <span className="text-slate-400">Thời gian: </span>
                          <b className="font-semibold text-slate-700">
                            {item.durationMinutes ? `${item.durationMinutes} phút` : "Không giới hạn"}
                          </b>
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] sm:w-[185px]">
                      <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        <span className="block leading-snug">
                          <span className="text-slate-400">Mở: </span>
                          <b className="font-semibold text-slate-700">{formatDateTime(item.openAt)}</b>
                        </span>
                        <span className="block leading-snug">
                          <span className="text-slate-400">Hạn: </span>
                          <b className="font-semibold text-slate-700">{formatDateTime(item.dueAt)}</b>
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-start gap-1.5">
                      <QuizStatusBadge status={item.status} />
                      <SubmitProgress done={attempts.submitted} total={attempts.total} label="Đã làm" />
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {busy ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[#0f6cbf]" />
                      ) : (
                        <RowMenu
                          items={[
                            { label: "Xem chi tiết", onClick: () => void openDetail(item) },
                            ...(item.status === "DRAFT"
                              ? [
                                  { label: "Chỉnh sửa", onClick: () => goToEditor(item) },
                                  {
                                    label: "Xuất bản",
                                    onClick: () => void handlePublish(item),
                                  },
                                ]
                              : []),
                            ...(item.status === "PUBLISHED"
                              ? [{ label: "Đóng đề kiểm tra", onClick: () => void handleClose(item) }]
                              : []),
                            ...(item.status === "DRAFT"
                              ? [{ label: "Xóa", danger: true, onClick: () => setDeleting(item) }]
                              : []),
                          ]}
                        />
                      )}
                      <button
                        onClick={() => void openDetail(item)}
                        className="whitespace-nowrap rounded-lg border border-blue-200 px-3.5 py-2 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Xem chi tiết
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
            {filtered.length === 0 && (
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {items.length === 0
                  ? "Chưa có đề kiểm tra nào. Bấm “Tạo bài kiểm tra” để bắt đầu."
                  : "Không tìm thấy bài kiểm tra nào phù hợp với bộ lọc."}
              </p>
            )}
            <p className="mt-4 text-[13px] text-slate-500">
              Hiển thị {filtered.length} trong {items.length} bài kiểm tra
            </p>
          </>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo bài kiểm tra mới">
        {courses.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
            Bạn chưa có khóa học nào. Hãy tạo khóa học trước khi thêm đề kiểm tra.
          </p>
        ) : (
          <div className="space-y-3.5">
            <p className="text-[13px] text-slate-500">
              Chọn khóa học và topic đích. Đề kiểm tra sẽ được tạo trong trình soạn thảo nội dung khóa học.
            </p>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Khóa học</label>
              <select
                value={createCourseId}
                onChange={(e) => {
                  const courseId = e.target.value;
                  setCreateCourseId(courseId);
                  setCreateModuleId(modulesByCourse[courseId]?.[0]?.id ?? "");
                }}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.courseCode} — {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Topic</label>
              <select
                value={createModuleId}
                onChange={(e) => setCreateModuleId(e.target.value)}
                disabled={createModules.length === 0}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
              >
                {createModules.length === 0 ? (
                  <option value="">Khóa học chưa có topic</option>
                ) : (
                  createModules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                disabled={!createCourseId || !createModuleId}
                onClick={() => {
                  setCreateOpen(false);
                  router.push(
                    `/teacher/content/courses/${createCourseId}/lessons/new?section=${createModuleId}&type=QUIZ`,
                  );
                }}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết bài kiểm tra">
        {detail && detailQuiz && (
          <div className="space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[16px] font-bold">{detailQuiz.title}</p>
              <QuizStatusBadge status={detailQuiz.status} />
            </div>
            <p className="text-slate-500">{stripHtml(detailQuiz.instructions) || "Chưa có hướng dẫn làm bài."}</p>
            <p className="text-slate-500">
              Khóa học {detail.courseCode} • {detail.courseName} • Topic {detail.moduleTitle}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Số câu</p>
                <p className="font-bold">{detailQuiz.questionCount}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Tổng điểm</p>
                <p className="font-bold">{detailTotal}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Thời gian</p>
                <p className="font-bold">
                  {detailQuiz.durationMinutes ? `${detailQuiz.durationMinutes} phút` : "Không giới hạn"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Số lần làm</p>
                <p className="font-bold">{detailQuiz.maxAttempts}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Mở</p>
                <p className="font-bold">{formatDateTime(detailQuiz.openAt)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Hạn</p>
                <p className="font-bold">{formatDateTime(detailQuiz.dueAt)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Đã làm</p>
                <p className="font-bold">
                  {detailQuiz.attemptStats?.submitted ?? 0}/{detailQuiz.attemptStats?.total ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Sổ điểm</p>
                <p className="font-bold">{detailQuiz.scoringEnabled ? "Có" : "Không"}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 text-[13px] font-bold text-slate-800">Danh sách câu hỏi</p>
              {detailLoading ? (
                <p className="flex items-center gap-2 text-[13px] text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-[#0f6cbf]" /> Đang tải câu hỏi...
                </p>
              ) : detailQuestions.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-[13px] text-slate-500">
                  Đề chưa có câu hỏi nào.
                </p>
              ) : (
                <ol className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {detailQuestions.map((question, index) => (
                    <li key={question.id} className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-[13px] font-medium text-slate-800">
                        {index + 1}. {question.questionSnapshot.content}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {question.questionSnapshot.questionType === "MULTIPLE" ? "Nhiều đáp án" : "Một đáp án"} ·{" "}
                        {question.maxScore} điểm
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Xóa bài kiểm tra?" widthClass="max-w-[420px]">
        {deleting && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">
              Xóa <b className="text-slate-900">{deleting.title}</b>? Không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                disabled={busyId === deleting.id}
                className="rounded-lg px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={busyId === deleting.id}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busyId === deleting.id && <Loader2 className="h-4 w-4 animate-spin" />} Xóa
              </button>
            </div>
          </div>
        )}
      </Modal>
      <Toast message={toast} />
    </TeacherShell>
  );
}
