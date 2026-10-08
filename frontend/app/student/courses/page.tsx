"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Search,
  Plus,
  Loader2,
  Users,
  Copy,
  Check,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import JoinCourseModal from "../components/JoinCourseModal";
import { TONE_BOX } from "../components/student-shared";
import { daySchedule24, studentNotifs } from "@/lib/mock/student";
import type { StudentClass } from "@/lib/types/student";
import { fetchStudentCourses } from "@/lib/api/course-api";
import {
  mapCourseDtoToStudentClass,
  type CourseDto,
} from "@/lib/types/course";

type Tab = "all" | "ongoing" | "finished";

export default function StudentCoursesPage() {
  const router = useRouter();
  const [topSearch, setTopSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Mới nhất");
  const [copied, setCopied] = useState("");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [courses, setCourses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard fallback */
    }
    setCopied(code);
    showToast(`Đã sao chép mã môn học ${code}`);
    window.setTimeout(() => setCopied(""), 1500);
  };

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchStudentCourses();
      const mapped = (res.items || []).map(mapCourseDtoToStudentClass);
      setCourses(mapped);
    } catch (err: unknown) {
      const error = err as { message?: string };
      showToast(error?.message || "Không thể tải danh sách môn học");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleJoinSuccess = (joinedDto: CourseDto, message: string) => {
    const newCourse = mapCourseDtoToStudentClass(joinedDto);
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c.id === newCourse.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newCourse;
        return next;
      }
      return [newCourse, ...prev];
    });
    showToast(message);
  };

  const counts = useMemo(
    () => ({
      all: courses.length,
      ongoing: courses.filter((c) => c.status === "studying").length,
      finished: courses.filter((c) => c.status === "finished").length,
    }),
    [courses],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = courses;
    if (tab === "ongoing") list = list.filter((c) => c.status === "studying");
    if (tab === "finished") list = list.filter((c) => c.status === "finished");
    if (q) list = list.filter((c) => `${c.name} ${c.code} ${c.teacher}`.toLowerCase().includes(q));
    if (sort === "Tên A-Z") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (sort === "Sĩ số nhiều nhất") list = [...list].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
    return list;
  }, [courses, tab, query, topSearch, sort]);

  return (
    <StudentShell
      activeId="classes"
      searchPlaceholder="Tìm kiếm môn học, bài học, tài liệu, bài tập..."
      searchValue={topSearch}
      onSearchChange={setTopSearch}
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight">Môn học của tôi</h1>
              <p className="mt-0.5 text-[14px] text-slate-500">Danh sách các môn học bạn đang tham gia</p>
            </div>
            <button
              onClick={() => setJoinModalOpen(true)}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Tham gia môn học
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 border-b border-slate-200">
              {([["all", `Tất cả môn học (${counts.all})`], ["ongoing", `Đang diễn ra (${counts.ongoing})`], ["finished", `Đã kết thúc (${counts.finished})`]] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`relative px-3 pb-2.5 pt-1 text-[13.5px] font-medium ${tab === id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {label}
                  {tab === id && <span className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>
            <span className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm môn học..."
                className="h-10 w-[220px] rounded-lg bg-white pl-9 pr-3 text-[13px] outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100"
              />
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 rounded-lg bg-white px-3 text-[13px] outline-none ring-1 ring-slate-200"
              aria-label="Sắp xếp"
            >
              <option value="Mới nhất">Sắp xếp: Mới nhất</option>
              <option value="Tên A-Z">Sắp xếp: Tên A-Z</option>
              <option value="Sĩ số nhiều nhất">Sắp xếp: Sĩ số nhiều nhất</option>
            </select>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/70 bg-white py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-3 text-[13.5px] font-medium text-slate-500">Đang tải danh sách môn học...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-14 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-[16px] font-bold text-slate-800">
                  {courses.length === 0 ? "Chưa tham gia môn học nào" : "Không tìm thấy môn học phù hợp"}
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">
                  {courses.length === 0
                    ? "Nhập mã môn học do giảng viên cung cấp để tham gia vào môn và bắt đầu học tập."
                    : "Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại bộ lọc trạng thái."}
                </p>
                {courses.length === 0 && (
                  <button
                    onClick={() => setJoinModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tham gia môn học ngay
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filtered.map((c) => (
                  <article
                    key={c.id}
                    className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-100"
                  >
                    {/* 1. Ảnh bìa (Google Classroom style banner) */}
                    <div
                      className={`relative h-32 w-full overflow-hidden rounded-t-2xl bg-gradient-to-r ${
                        c.coverGradient || "from-blue-600 via-indigo-600 to-sky-600"
                      }`}
                    >
                      {c.coverImageUrl ? (
                        <img
                          src={c.coverImageUrl}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        /* Họa tiết trang trí tự sinh + Biểu tượng môn học */
                        <div className="absolute inset-0 flex items-center justify-between px-4 overflow-hidden">
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                          <div className="relative z-0 opacity-20 text-white font-extrabold text-7xl select-none -translate-x-2">
                            {c.code.slice(0, 3)}
                          </div>
                          <span
                            className="relative z-0 select-none text-5xl opacity-40 transition-transform group-hover:scale-110"
                            aria-hidden
                          >
                            {c.coverEmoji || "📚"}
                          </span>
                        </div>
                      )}

                      {/* 2. Trạng thái */}
                      <span className="absolute left-3 top-3 z-10">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-xs backdrop-blur-md ${
                            c.status === "finished"
                              ? "bg-slate-900/75 text-slate-200 border border-white/20"
                              : "bg-emerald-500/90 text-white border border-emerald-300/30"
                          }`}
                        >
                          {c.status === "finished" ? "⏸ Đã kết thúc" : "🟢 Đang học"}
                        </span>
                      </span>
                    </div>

                    {/* Thân thẻ: 4 thông tin còn lại */}
                    <div className="flex flex-1 flex-col p-4">
                      {/* 3. Tên môn */}
                      <h2
                        className="text-[16px] font-extrabold text-slate-800 line-clamp-1 transition group-hover:text-blue-600 cursor-pointer"
                        onClick={() => router.push("/student/content")}
                        title={c.name}
                      >
                        {c.name}
                      </h2>

                      {/* 4. Mã môn */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] font-mono font-bold text-blue-700">
                          Mã môn: {c.code}
                        </span>
                        <button
                          onClick={() => copyCode(c.code)}
                          aria-label={`Sao chép mã ${c.code}`}
                          title="Sao chép mã môn học"
                          className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                        >
                          {copied === c.code ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {/* 5. Giáo viên & 6. Sĩ số */}
                      <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-[12.5px] text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                            {c.teacher.charAt(0)}
                          </span>
                          <span className="truncate">
                            <span className="text-slate-400">Giảng viên:</span>{" "}
                            <span className="font-medium text-slate-700">{c.teacher}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="grid h-6 w-6 shrink-0 place-items-center text-slate-400">
                            <Users className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="text-slate-400">Sĩ số:</span>{" "}
                            <span className="font-semibold text-slate-700">
                              {c.memberCount ?? 0}
                            </span>{" "}
                            học sinh
                          </span>
                        </div>
                      </div>

                      {/* Nút hành động Vào môn học */}
                      <div className="mt-4 pt-1">
                        <button
                          onClick={() => router.push("/student/content")}
                          className="w-full rounded-xl bg-slate-50 py-2 text-center text-[12.5px] font-semibold text-slate-700 transition hover:bg-blue-600 hover:text-white cursor-pointer"
                        >
                          Vào môn học
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">📅 Lịch học sắp tới</h2>
              <button onClick={() => router.push("/student/schedule")} className="text-[12.5px] font-medium text-blue-600">Xem tất cả →</button>
            </div>
            <ul className="space-y-3.5">
              {daySchedule24.slice(0, 1).concat([
                { id: "u2", time: "10:00 - 11:30", title: "Buổi học: Lập trình Web", meta: "Classroom Hub", action: "join" as const, tone: "blue" as const },
                { id: "u3", time: "23:59", title: "Hạn nộp bài tập", meta: "Classroom Hub", action: "none" as const, tone: "orange" as const },
              ]).map((e, i) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-10 shrink-0 text-center">
                    <b className="block text-[17px] leading-none">{["24", "25", "26"][i] || "24"}</b>
                    <span className="block text-[10.5px] text-slate-400">Th09</span>
                  </span>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE_BOX[e.tone as string] ?? "bg-blue-50 text-blue-600"}`}>
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[13px] font-bold text-slate-800">{e.title}</h4>
                    <span className="text-[11.5px] text-slate-400">{e.time}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">🔔 Thông báo</h2>
              <button onClick={() => router.push("/student/notifications")} className="text-[12.5px] font-medium text-blue-600">Xem tất cả →</button>
            </div>
            <ul className="space-y-3">
              {studentNotifs.slice(0, 3).map((n) => (
                <li key={n.id} className="text-[12.5px] text-slate-600">
                  <p className="font-semibold text-slate-800">{n.title}</p>
                  <p className="text-[11.5px] text-slate-400">{n.timeAgo}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <JoinCourseModal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onSuccess={handleJoinSuccess}
      />
      <Toast message={toast} />
    </StudentShell>
  );
}

