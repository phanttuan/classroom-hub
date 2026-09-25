"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  Megaphone,
  MoreVertical,
} from "lucide-react";
import GreetingHeader from "../components/common/GreetingHeader";
import StudentShell, { Toast } from "./components/StudentShell";
import { Progress, SectionHead, StatCard, TONE_BOX } from "./components/student-shared";
import {
  daySchedule24,
  greetingDateLabel,
  studentClasses,
  studentDeadlines,
  studentDocs,
  studentNotifs,
  studentProfile,
  studentRecentScores,
} from "@/lib/mock/student";

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function MiniCal({ selected, onSelect }: { selected: number; onSelect: (d: number) => void }) {
  // Tháng 9/2026: ngày 1 là Thứ 3 -> 1 ô trống đầu (Thứ 2)
  const cells: (number | null)[] = [null, ...Array.from({ length: 30 }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
        {WD.map((w) => (<span key={w} className="py-1">{w}</span>))}
      </div>
      <div className="grid grid-cols-7 text-center text-[12.5px]">
        {cells.map((d, i) =>
          d === null ? (
            <span key={`e${i}`} />
          ) : (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className={`relative mx-auto grid h-7 w-7 place-items-center rounded-full transition ${
                d === selected ? "bg-blue-600 font-bold text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d}
              {[3, 8, 10, 15, 18, 24].includes(d) && d !== selected && (
                <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${d === 10 ? "bg-red-500" : d === 15 ? "bg-green-500" : "bg-orange-400"}`} />
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [calDay, setCalDay] = useState(24);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  const classes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return studentClasses.slice(0, 3);
    return studentClasses.filter((c) => `${c.name} ${c.code}`.toLowerCase().includes(q));
  }, [search]);

  return (
    <StudentShell activeId="home" searchPlaceholder="Tìm kiếm khóa học, bài học, tài liệu..." searchValue={search} onSearchChange={setSearch}>
      {/* Banner chào (dùng chung 3 role) */}
      <GreetingHeader
        name={studentProfile.fullName}
        subtitle="Chúc bạn một ngày học tập hiệu quả!"
        dateLabel={greetingDateLabel}
      />

      {/* Stats */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<BookOpen className="h-6 w-6" />} iconCls="bg-blue-50 text-blue-600" value="3" label="Lớp học đang tham gia" />
        <StatCard icon={<FileText className="h-6 w-6" />} iconCls="bg-red-50 text-red-500" value="5" label="Bài tập cần nộp" />
        <StatCard icon={<CheckSquare className="h-6 w-6" />} iconCls="bg-purple-50 text-purple-600" value="2" label="Bài kiểm tra sắp tới" />
        <StatCard icon={<BarChart3 className="h-6 w-6" />} iconCls="bg-green-50 text-green-600" value="7.8" label="Điểm trung bình" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* Cột trái */}
        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
            <SectionHead title="Lớp học của tôi" onAction={() => router.push("/student/classes")} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <article key={c.id} className="overflow-hidden rounded-xl border border-slate-200/70 transition hover:shadow-md">
                  <div className={`grid h-28 place-items-center bg-gradient-to-br text-5xl ${c.coverGradient}`}>
                    <span aria-hidden>{c.coverEmoji}</span>
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] font-bold text-blue-600">{c.code}</span>
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-green-100/80 px-2 py-0.5 text-[11.5px] font-medium text-green-700">Đang học</span>
                      <span className="relative ml-auto">
                        <button onClick={() => setMenuId(menuId === c.id ? null : c.id)} aria-label="Tùy chọn" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === c.id && (
                          <>
                            <button aria-label="Đóng" onClick={() => setMenuId(null)} className="fixed inset-0 z-10 cursor-default" />
                            <span className="absolute right-0 top-full z-20 w-40 overflow-hidden rounded-xl border bg-white py-1 text-left shadow-xl">
                              <button onClick={() => { setMenuId(null); router.push("/student/classes"); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Xem lớp học</button>
                              <button onClick={() => { setMenuId(null); showToast(`Đã ghim ${c.code} lên đầu`); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Ghim lớp học</button>
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[14.5px] font-bold leading-snug">{c.name}</h3>
                    <p className="mt-1.5 flex items-center gap-2 text-[12.5px] text-slate-500">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-[10px] font-bold text-white">
                        {c.teacher.charAt(0)}
                      </span>
                      <span>{c.teacher}<br /><span className="text-[11px] text-slate-400">Giáo viên</span></span>
                    </p>
                    <div className="mt-2"><Progress value={c.progress} /></div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
            <SectionHead title="📅 Lịch học & sự kiện" onAction={() => router.push("/student/schedule")} />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <p className="mb-1 flex items-center justify-between text-[13px] font-bold">
                  <span className="flex gap-2 text-slate-400">‹ ›</span> Tháng 9, 2026 <span />
                </p>
                <MiniCal selected={calDay} onSelect={(d) => { setCalDay(d); if (d !== 24) showToast(`Ngày ${d}/09/2026 (demo — chi tiết mẫu ngày 24)`); }} />
              </div>
              <div>
                <p className="flex items-center justify-between text-[13.5px] font-bold">
                  Sự kiện trong ngày 24/09/2026 <span className="text-[12px] font-normal text-slate-400">3 sự kiện</span>
                </p>
                <ul className="mt-2.5 space-y-3">
                  {daySchedule24.map((e) => (
                    <li key={e.id} className="flex items-center gap-3">
                      <span className="w-[86px] shrink-0 text-[11.5px] text-slate-400">{e.time}</span>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE_BOX[e.tone]}`}>
                        {e.tone === "purple" ? <FileText className="h-4 w-4" /> : e.tone === "blue" ? <CalendarDays className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[13px]">{e.title}</b>
                        <span className="block truncate text-[11.5px] text-slate-400">{e.meta}</span>
                      </span>
                      {e.action === "quiz" ? (
                        <button onClick={() => router.push("/student/quizzes")} className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700">Vào làm bài</button>
                      ) : e.action === "join" ? (
                        <button onClick={() => showToast("Đã mở link Google Meet (demo)")} className="shrink-0 rounded-lg border border-blue-200 px-3.5 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">Tham gia</button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
            <SectionHead title="📢 Thông báo mới" onAction={() => router.push("/student/notifications")} />
            <ul className="space-y-3.5">
              {studentNotifs.map((n) => (
                <li key={n.id}>
                  <button onClick={() => router.push("/student/notifications")} className="flex w-full gap-3 text-left">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TONE_BOX[n.tone]}`}>
                      {n.tone === "blue" ? <Megaphone className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <b className="text-[13px]">{n.title}</b>
                        <span className="shrink-0 text-[11px] text-slate-400">{n.timeAgo}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-slate-500">{n.desc}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Cột phải */}
        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
            <SectionHead title="⏳ Sắp đến hạn" onAction={() => router.push("/student/assignments")} />
            <ul className="space-y-3.5">
              {studentDeadlines.map((d) => (
                <li key={d.id}>
                  <button onClick={() => router.push(d.kind === "assignment" ? "/student/assignments" : "/student/quizzes")} className="flex w-full gap-2.5 text-left">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TONE_BOX[d.tone]}`}>
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13px]">{d.title}</b>
                      <span className="block truncate text-[11.5px] text-slate-400">{d.course}</span>
                      <span className="block truncate text-[11.5px] text-slate-400">{d.dueLabel}</span>
                    </span>
                    <span className="h-fit shrink-0 whitespace-nowrap rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-500">{d.daysLeft}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
            <SectionHead title="Điểm gần đây" onAction={() => router.push("/student/grades")} />
            <ul className="space-y-3">
              {studentRecentScores.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-500"><FileText className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13px]">{s.title}</b>
                    <span className="block text-[11.5px] text-slate-400">{s.code}</span>
                  </span>
                  <span className="text-right">
                    <b className="block text-[13.5px] text-green-600">{s.score.toFixed(1)} <span className="font-normal text-slate-400">/ 10</span></b>
                    <span className="block text-[11px] text-slate-400">{s.date}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
            <SectionHead title="📄 Tài liệu mới" onAction={() => router.push("/student/content")} />
            <ul className="space-y-3">
              {studentDocs.map((d) => (
                <li key={d.id}>
                  <button onClick={() => showToast(`Đang tải "${d.title}" (demo)`)} className="flex w-full items-center gap-2.5 text-left">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500"><FileText className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13px]">{d.title}</b>
                      <span className="block text-[11.5px] text-slate-400">{d.meta}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">{d.timeAgo}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Toast message={toast} />
    </StudentShell>
  );
}
