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
import Modal from "../../teacher/components/Modal";
import JoinClassModal from "../components/JoinClassModal";
import { TONE_BOX } from "../components/student-shared";
import { daySchedule24, studentNotifs } from "@/lib/mock/student";
import type { StudentClass } from "@/lib/types/student";
import { fetchStudentClasses } from "@/lib/api/class-api";
import {
  mapClassroomDtoToStudentClass,
  type ClassroomDto,
} from "@/lib/types/class";

type Tab = "all" | "ongoing" | "finished";

export default function StudentClassesPage() {
  const router = useRouter();
  const [topSearch, setTopSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Mới nhất");
  const [copied, setCopied] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [classes, setClasses] = useState<StudentClass[]>([]);
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
    showToast(`Đã sao chép mã lớp ${code}`);
    window.setTimeout(() => setCopied(""), 1500);
  };

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchStudentClasses();
      const mapped = (res.items || []).map(mapClassroomDtoToStudentClass);
      setClasses(mapped);
    } catch (err: any) {
      showToast(err?.message || "Không thể tải danh sách lớp học");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleJoinSuccess = (joinedDto: ClassroomDto, message: string) => {
    const newClass = mapClassroomDtoToStudentClass(joinedDto);
    setClasses((prev) => {
      const idx = prev.findIndex((c) => c.id === newClass.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newClass;
        return next;
      }
      return [newClass, ...prev];
    });
    showToast(message);
  };

  const counts = useMemo(
    () => ({
      all: classes.length,
      ongoing: classes.filter((c) => c.status === "studying").length,
      finished: classes.filter((c) => c.status === "finished").length,
    }),
    [classes],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = classes;
    if (tab === "ongoing") list = list.filter((c) => c.status === "studying");
    if (tab === "finished") list = list.filter((c) => c.status === "finished");
    if (q) list = list.filter((c) => `${c.name} ${c.code} ${c.teacher}`.toLowerCase().includes(q));
    if (sort === "Tên A-Z") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (sort === "Sĩ số nhiều nhất") list = [...list].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
    return list;
  }, [classes, tab, query, topSearch, sort]);

  return (
    <StudentShell activeId="classes" searchPlaceholder="Tìm kiếm khóa học, bài học, tài liệu, bài tập..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight">Lớp học của tôi</h1>
              <p className="mt-0.5 text-[14px] text-slate-500">Danh sách các lớp học bạn đang tham gia</p>
            </div>
            <button
              onClick={() => setJoinModalOpen(true)}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Tham gia lớp học
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 border-b border-slate-200">
              {([["all", `Tất cả lớp học (${counts.all})`], ["ongoing", `Đang diễn ra (${counts.ongoing})`], ["finished", `Đã kết thúc (${counts.finished})`]] as [Tab, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} className={`relative px-3 pb-2.5 pt-1 text-[13.5px] font-medium ${tab === id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                  {label}
                  {tab === id && <span className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>
            <span className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm lớp học..."
                className="h-10 w-[220px] rounded-lg bg-white pl-9 pr-3 text-[13px] outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100" />
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
                <p className="mt-3 text-[13.5px] font-medium text-slate-500">Đang tải danh sách lớp học...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-14 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-[16px] font-bold text-slate-800">
                  {classes.length === 0 ? "Chưa tham gia lớp học nào" : "Không tìm thấy lớp học phù hợp"}
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">
                  {classes.length === 0
                    ? "Nhập mã lớp học do giảng viên cung cấp để tham gia vào lớp và bắt đầu học tập."
                    : "Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại bộ lọc trạng thái."}
                </p>
                {classes.length === 0 && (
                  <button
                    onClick={() => setJoinModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tham gia lớp học ngay
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
                      {/* 3. Tên lớp */}
                      <h2
                        className="text-[16px] font-extrabold text-slate-800 line-clamp-1 transition group-hover:text-blue-600 cursor-pointer"
                        onClick={() => router.push("/student/content")}
                        title={c.name}
                      >
                        {c.name}
                      </h2>

                      {/* 4. Mã lớp */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] font-mono font-bold text-blue-700">
                          Mã lớp: {c.code}
                        </span>
                        <button
                          onClick={() => copyCode(c.code)}
                          aria-label={`Sao chép mã ${c.code}`}
                          title="Sao chép mã lớp"
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

                      {/* Nút hành động Vào lớp */}
                      <div className="mt-4 pt-1">
                        <button
                          onClick={() => router.push("/student/content")}
                          className="w-full rounded-xl bg-slate-50 py-2 text-center text-[12.5px] font-semibold text-slate-700 transition hover:bg-blue-600 hover:text-white cursor-pointer"
                        >
                          Vào lớp học
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
                  <span className="min-w-0">
                    <b className="block truncate text-[12.5px]">{e.title}</b>
                    <span className="block text-[11px] text-slate-400">🕐 {e.time}</span>
                    <span className="block truncate text-[11px] text-slate-400">{e.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">📢 Thông báo mới</h2>
              <button onClick={() => router.push("/student/notifications")} className="text-[12.5px] font-medium text-blue-600">Xem tất cả →</button>
            </div>
            <ul className="space-y-3">
              {studentNotifs.map((n) => (
                <li key={n.id} className="flex gap-2.5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE_BOX[n.tone]}`}><FileText className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2"><b className="text-[12.5px]">{n.title}</b><span className="shrink-0 text-[10.5px] text-slate-400">{n.timeAgo}</span></span>
                    <span className="line-clamp-2 text-[11.5px] text-slate-500">{n.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-center">
            <span className="text-5xl" aria-hidden>🧑‍💻</span>
            <h2 className="mt-1 text-[15px] font-extrabold">Cần hỗ trợ?</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">Liên hệ giảng viên hoặc xem hướng dẫn sử dụng nếu bạn gặp khó khăn.</p>
            <button onClick={() => setGuideOpen(true)} className="mt-2.5 rounded-lg border border-blue-300 bg-white px-4 py-2 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">
              Xem hướng dẫn ⬈
            </button>
          </section>
        </div>
      </div>

      <JoinClassModal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onSuccess={handleJoinSuccess}
      />



      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Hướng dẫn sử dụng">
        <ol className="list-decimal space-y-2 pl-5 text-[13.5px] leading-relaxed text-slate-600">
          <li>Nhấn &ldquo;Tham gia lớp học&rdquo; và nhập mã mời từ giảng viên.</li>
          <li>Vào lớp học để xem bài học, tài liệu và tiến độ.</li>
          <li>Nộp bài tập trước hạn trong mục Bài tập.</li>
          <li>Làm bài kiểm tra đúng khung giờ quy định.</li>
          <li>Theo dõi điểm số trong mục Sổ điểm.</li>
          <li>Liên hệ giảng viên qua email khi cần hỗ trợ.</li>
        </ol>
      </Modal>

      <Toast message={toast} />
    </StudentShell>
  );
}
