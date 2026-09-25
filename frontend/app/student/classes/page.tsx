"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Clock,
  FileText,
  MapPin,
  MoreVertical,
  Search,
  User,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import Modal from "../../teacher/components/Modal";
import { Progress, TONE_BOX } from "../components/student-shared";
import { daySchedule24, studentClasses, studentNotifs } from "@/lib/mock/student";
import type { StudentClass } from "@/lib/types/student";

type Tab = "all" | "ongoing" | "finished";

export default function StudentClassesPage() {
  const router = useRouter();
  const [topSearch, setTopSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Mới nhất");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<StudentClass | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  const counts = useMemo(
    () => ({
      all: studentClasses.length,
      ongoing: studentClasses.filter((c) => c.status === "studying").length,
      finished: studentClasses.filter((c) => c.status === "finished").length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = studentClasses.filter((c) => !hidden.includes(c.id));
    if (tab === "ongoing") list = list.filter((c) => c.status === "studying");
    if (tab === "finished") list = list.filter((c) => c.status === "finished");
    if (q) list = list.filter((c) => `${c.name} ${c.code} ${c.teacher}`.toLowerCase().includes(q));
    if (sort === "Tên A-Z") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (sort === "Tiến độ cao nhất") list = [...list].sort((a, b) => b.progress - a.progress);
    return list;
  }, [tab, query, topSearch, sort, hidden]);

  const tiles = (c: StudentClass) => [
    { icon: <BookOpen className="h-5 w-5" />, label: "Nội dung học tập", sub: c.status === "finished" ? "Xem lại tài liệu" : "Xem bài học, tài liệu", go: () => router.push("/student/content") },
    { icon: <FileText className="h-5 w-5" />, label: "Bài tập", sub: c.assignmentNote ?? "", go: () => router.push("/student/assignments"), hot: (c.assignmentNote ?? "").includes("sắp đến hạn") },
    { icon: <CheckSquare className="h-5 w-5" />, label: "Kiểm tra trắc nghiệm", sub: c.quizNote ?? "", go: () => router.push("/student/quizzes"), hot: (c.quizNote ?? "").includes("sắp đến hạn") },
    { icon: <BookOpen className="h-5 w-5" />, label: "Sổ điểm", sub: "Xem điểm chi tiết", go: () => router.push("/student/grades") },
  ];

  return (
    <StudentShell activeId="classes" searchPlaceholder="Tìm kiếm khóa học, bài học, tài liệu, bài tập..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Lớp học của tôi</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Danh sách các lớp học bạn đang tham gia</p>

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
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg bg-white px-3 text-[13px] outline-none ring-1 ring-slate-200" aria-label="Sắp xếp">
              {["Mới nhất", "Tên A-Z", "Tiến độ cao nhất"].map((o) => (<option key={o}>Sắp xếp: {o}</option>))}
            </select>
          </div>

          <div className="mt-4 space-y-4">
            {filtered.map((c) => (
              <article key={c.id} className="rounded-xl border border-slate-200/70 bg-white p-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className={`relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-br md:h-auto md:w-52 ${c.coverGradient}`}>
                    <span className="absolute inset-0 grid place-items-center text-6xl" aria-hidden>{c.coverEmoji}</span>
                    <span className={`absolute left-2.5 top-2.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${c.status === "finished" ? "bg-white/90 text-slate-600" : "bg-green-100/90 text-green-700"}`}>
                      {c.status === "finished" ? "⏸ Đã kết thúc" : "🟢 Đang học"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-[17px] font-extrabold">{c.name}</h2>
                        <span className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[12px] font-bold text-blue-600">{c.code}</span>
                      </div>
                      <span className="relative">
                        <button onClick={() => setMenuId(menuId === c.id ? null : c.id)} aria-label="Tùy chọn" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === c.id && (
                          <>
                            <button aria-label="Đóng" onClick={() => setMenuId(null)} className="fixed inset-0 z-10 cursor-default" />
                            <span className="absolute right-0 top-full z-20 w-44 overflow-hidden rounded-xl border bg-white py-1 text-left shadow-xl">
                              <button onClick={() => { setMenuId(null); showToast(`Chi tiết ${c.code} (demo)`); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Xem chi tiết</button>
                              <button onClick={() => { setMenuId(null); setHidden((h) => [...h, c.id]); showToast(`Đã ẩn ${c.code} khỏi danh sách`); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Ẩn khỏi danh sách</button>
                              <button onClick={() => { setMenuId(null); setLeaving(c); }} className="block w-full px-3.5 py-2 text-left text-[12.5px] text-red-600 hover:bg-red-50">Rời lớp học</button>
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-[12.5px] text-slate-500">
                      <li className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Giảng viên: {c.teacher}</li>
                      <li className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Thời gian: {c.timeRange}</li>
                      <li className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Lịch học: {c.scheduleText}</li>
                      <li className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Phòng học: {c.room}</li>
                    </ul>
                    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                      {tiles(c).map((t) => (
                        <button key={t.label} onClick={t.go} className="flex items-center gap-2 rounded-xl border border-slate-200/70 p-2.5 text-left transition hover:border-blue-200 hover:bg-blue-50/40">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">{t.icon}</span>
                          <span className="min-w-0">
                            <b className="block truncate text-[12px]">{t.label}</b>
                            <span className={`block truncate text-[11px] ${t.hot ? "text-red-500" : "text-slate-400"}`}>{t.sub}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-full shrink-0 md:w-44">
                    <p className="flex items-center justify-between text-[12px] text-slate-500">Tiến độ học tập <b className="text-slate-700">{c.progress}%</b></p>
                    <div className="mt-1"><Progress value={c.progress} /></div>
                    <p className="mt-1 text-[11.5px] text-slate-400">Hoàn thành {c.lessonsDone} / {c.lessonsTotal} bài học</p>
                    <div className={`mt-2.5 rounded-xl p-3 text-center ${c.status === "finished" ? "bg-orange-50" : "bg-green-50/70"}`}>
                      <p className="text-[11.5px] text-slate-500">{c.status === "finished" ? "Tổng điểm cuối kỳ" : "Tổng điểm hiện tại"}</p>
                      <button onClick={() => router.push("/student/grades")} className={`text-[19px] font-extrabold ${c.currentScore !== null && c.currentScore >= 8 ? "text-green-600" : "text-orange-500"}`}>
                        {c.currentScore === null ? "-" : `${c.currentScore.toFixed(1)} `}<span className="text-[13px] font-medium text-slate-400">/ 10</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500">Không tìm thấy lớp học nào.</p>}
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
                { id: "u2", time: "10:00 - 11:30", title: "Buổi học: Responsive Web Design", meta: "Lớp: WEB301 - Phòng 301", action: "join" as const, tone: "blue" as const },
                { id: "u3", time: "23:59", title: "Hạn nộp bài tập 2: JavaScript", meta: "Lớp: WEB301", action: "none" as const, tone: "orange" as const },
                { id: "u4", time: "08:00 - 09:30", title: "Buổi học: Python nâng cao", meta: "Lớp: PY101 - Phòng 201", action: "none" as const, tone: "blue" as const },
              ]).map((e, i) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-10 shrink-0 text-center">
                    <b className="block text-[17px] leading-none">{["24", "24", "25", "26"][i]}</b>
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

      <Modal open={!!leaving} onClose={() => setLeaving(null)} title="Rời lớp học?" widthClass="max-w-[420px]">
        {leaving && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">Bạn chắc chắn muốn rời lớp <b className="text-slate-900">{leaving.name}</b>? Tiến độ học tập sẽ không được lưu.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLeaving(null)} className="rounded-lg px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100">Ở lại</button>
              <button onClick={() => { setHidden((h) => [...h, leaving.id]); setLeaving(null); showToast("Đã rời lớp (demo)"); }} className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700">Rời lớp</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Hướng dẫn sử dụng">
        <ol className="list-decimal space-y-2 pl-5 text-[13.5px] leading-relaxed text-slate-600">
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
