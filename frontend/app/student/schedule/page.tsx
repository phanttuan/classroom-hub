"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  ListChecks,
  MapPin,
  Monitor,
  Sparkles,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import Modal from "../../teacher/components/Modal";
import { weekEvents } from "@/lib/mock/student";
import type { WeekEvent, WeekEventType } from "@/lib/types/student";

const MOCK_TODAY = "2026-09-24";
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20
const ROW_H = 56;

const TYPE_META: Record<WeekEventType, { label: string; bg: string; border: string; text: string; check: string }> = {
  class: { label: "Lịch học", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", check: "bg-blue-600" },
  assignment: { label: "Bài tập", bg: "bg-red-50", border: "border-red-200", text: "text-red-600", check: "bg-red-500" },
  quiz: { label: "Kiểm tra", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", check: "bg-orange-500" },
  event: { label: "Sự kiện", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", check: "bg-purple-600" },
};

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function addDays(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function mondayOf(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const diff = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - diff);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
const WD = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const WD_MINI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function StudentSchedulePage() {
  const [topSearch, setTopSearch] = useState("");
  const [pill, setPill] = useState<"all" | WeekEventType>("all");
  const [mode, setMode] = useState<"week" | "day">("week");
  const [weekStart, setWeekStart] = useState(mondayOf(MOCK_TODAY));
  const [selDay, setSelDay] = useState(MOCK_TODAY);
  const [visible, setVisible] = useState<Record<WeekEventType, boolean>>({ class: true, assignment: true, quiz: true, event: true });
  const [detail, setDetail] = useState<WeekEvent | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  const weekKeys = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const title = `${weekKeys[0].slice(8, 10)} - ${weekKeys[6].slice(8, 10)} Tháng 9, 2026`;

  const shown = useMemo(() => {
    const q = topSearch.trim().toLowerCase();
    return weekEvents.filter((e) => {
      if (!visible[e.type]) return false;
      if (pill !== "all" && e.type !== pill) return false;
      if (q && !`${e.title} ${e.course} ${e.room}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [visible, pill, topSearch]);

  const byDay = useMemo(() => {
    const map = new Map<string, WeekEvent[]>();
    for (const e of shown) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [shown]);

  const upcoming = useMemo(
    () => [...shown].filter((e) => e.date >= MOCK_TODAY).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 5),
    [shown],
  );

  const dayList = useMemo(
    () => [...shown].filter((e) => e.date === selDay).sort((a, b) => a.start.localeCompare(b.start)),
    [shown, selDay],
  );

  // mini calendar tháng 9/2026
  const miniCells: (number | null)[] = useMemo(() => {
    const cells: (number | null)[] = [null, ...Array.from({ length: 30 }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, []);
  const dotDays = useMemo(() => new Set(shown.map((e) => Number(e.date.slice(8, 10)))), [shown]);

  const block = (e: WeekEvent) => {
    const meta = TYPE_META[e.type];
    const deadline = e.start === "23:59";
    const top = deadline ? (20 - 8) * ROW_H + 4 : (toMin(e.start) / 60 - 8) * ROW_H + 2;
    const h = deadline ? 26 : Math.max(30, ((toMin(e.end) - toMin(e.start)) / 60) * ROW_H - 4);
    return (
      <button key={e.id} onClick={() => setDetail(e)} title={`${e.title} (${e.start} - ${e.end})`}
        className={`absolute left-1 right-1 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left transition hover:brightness-95 ${meta.bg} ${meta.border} ${deadline ? "border" : ""}`}
        style={{ top, height: h }}>
        <p className="truncate text-[10.5px] font-medium text-slate-500">{e.start}{e.end !== e.start && e.end !== "23:59" ? ` - ${e.end}` : ""}</p>
        <p className={`truncate text-[11px] font-bold leading-tight ${meta.text}`}>{e.title}</p>
        {h > 44 && e.room && <p className="truncate text-[10px] text-slate-500">📍 {e.room}</p>}
      </button>
    );
  };

  return (
    <StudentShell activeId="schedule" searchPlaceholder="Tìm kiếm lịch học, bài kiểm tra, hạn nộp bài..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Lịch học</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Xem lịch học, lịch kiểm tra, hạn nộp bài và các sự kiện quan trọng</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "class", "assignment", "quiz", "event"] as const).map((t) => (
              <button key={t} onClick={() => setPill(t)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${pill === t ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200" : "bg-white text-slate-500 ring-1 ring-slate-200/70 hover:bg-slate-50"}`}>
                {t === "all" ? "Tất cả" : (
                  <>
                    {t === "class" ? <BookOpen className="h-4 w-4" /> : t === "assignment" ? <FileText className="h-4 w-4" /> : t === "quiz" ? <ListChecks className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {TYPE_META[t].label}
                  </>
                )}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-2">
              <select value={mode} onChange={(e) => setMode(e.target.value as "week" | "day")} className="h-10 rounded-lg bg-white px-3 text-[13px] outline-none ring-1 ring-slate-200" aria-label="Chế độ xem">
                <option value="week">Tuần</option>
                <option value="day">Ngày</option>
              </select>
              <button onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Tuần trước" className="grid h-10 w-9 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Tuần sau" className="grid h-10 w-9 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200"><ChevronRight className="h-4 w-4" /></button>
              <span className="hidden text-[13px] font-medium text-slate-600 sm:block">{title}</span>
              <button onClick={() => { setWeekStart(mondayOf(MOCK_TODAY)); setSelDay(MOCK_TODAY); }} className="h-10 rounded-lg bg-white px-3.5 text-[13px] font-medium text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50">Hôm nay</button>
            </span>
          </div>

          {mode === "week" ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200/70 bg-white">
              <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                <div className="border-b border-slate-100" />
                {weekKeys.map((k, i) => {
                  const isToday = k === MOCK_TODAY;
                  return (
                    <div key={k} className={`border-b border-slate-100 px-1 py-2 text-center ${isToday ? "bg-blue-50/70" : ""}`}>
                      <p className={`text-[12px] font-medium ${isToday ? "text-blue-600" : "text-slate-500"}`}>{WD[i]}</p>
                      <p className={`text-[12px] ${isToday ? "font-bold text-blue-600" : "text-slate-400"}`}>{k.slice(8, 10)}/09</p>
                    </div>
                  );
                })}
                <div className="relative">
                  {HOURS.map((h) => (
                    <p key={h} className="pr-1 text-right text-[10.5px] text-slate-400" style={{ height: ROW_H }}>{fmt(h)}:00</p>
                  ))}
                </div>
                {weekKeys.map((k) => {
                  const evs = byDay.get(k) ?? [];
                  const isToday = k === MOCK_TODAY;
                  return (
                    <div key={k} className={`relative border-l border-slate-100 ${isToday ? "bg-blue-50/50" : ""}`} style={{ height: HOURS.length * ROW_H }}>
                      {HOURS.map((h) => (<span key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: (h - 8) * ROW_H }} />))}
                      {isToday && <span className="absolute inset-x-0 z-10 flex items-center gap-1" style={{ top: 4 * ROW_H }}><span className="h-2 w-2 rounded-full bg-red-500" /><span className="h-px flex-1 bg-red-400" /></span>}
                      {evs.map(block)}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-slate-200/70 bg-white p-4">
              <h2 className="text-[15px] font-extrabold">Lịch ngày {selDay.slice(8, 10)}/09/2026</h2>
              <ul className="mt-3 space-y-2.5">
                {dayList.length === 0 && <li className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Không có sự kiện nào trong ngày này.</li>}
                {dayList.map((e) => {
                  const meta = TYPE_META[e.type];
                  return (
                    <li key={e.id}>
                      <button onClick={() => setDetail(e)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200/70 p-3 text-left hover:border-blue-200">
                        <span className="w-24 shrink-0 text-[12px] font-medium text-slate-500">{e.start} - {e.end}</span>
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${meta.bg} ${meta.text}`}>
                          {e.type === "class" ? <Monitor className="h-5 w-5" /> : e.type === "assignment" ? <FileText className="h-5 w-5" /> : e.type === "quiz" ? <ListChecks className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                        </span>
                        <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{e.title}</b><span className="block text-[12px] text-slate-400">{e.course} • {e.room || "Trực tuyến"}</span></span>
                        <span className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">Tháng 9, 2026</h2>
              <span className="flex gap-1">
                <button onClick={() => showToast("Xem tháng 8 (demo)")} aria-label="Trước" className="grid h-7 w-7 place-items-center rounded-lg text-blue-600 hover:bg-blue-50"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => showToast("Xem tháng 10 (demo)")} aria-label="Sau" className="grid h-7 w-7 place-items-center rounded-lg text-blue-600 hover:bg-blue-50"><ChevronRight className="h-4 w-4" /></button>
              </span>
            </div>
            <div className="mt-1 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
              {WD_MINI.map((w) => (<span key={w} className="py-1">{w}</span>))}
            </div>
            <div className="grid grid-cols-7 text-center text-[12.5px]">
              {miniCells.map((d, i) =>
                d === null ? (
                  <span key={`e${i}`} className="grid h-8 place-items-center text-slate-300">{i === 0 ? 31 : ["1", "2", "3", "4"][i - 31] ?? ""}</span>
                ) : (
                  <button key={d} onClick={() => { setSelDay(`2026-09-${String(d).padStart(2, "0")}`); setMode("day"); }}
                    className={`relative mx-auto grid h-8 w-8 place-items-center rounded-full transition ${`2026-09-${String(d).padStart(2, "0")}` === MOCK_TODAY ? "bg-blue-600 font-bold text-white" : d === 22 ? "bg-slate-100 text-slate-600" : "text-slate-600 hover:bg-slate-100"}`}>
                    {d}
                    {dotDays.has(d) && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />}
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">Sự kiện sắp tới</h2>
              <button onClick={() => setAllOpen(true)} className="text-[12.5px] font-medium text-blue-600">Xem tất cả →</button>
            </div>
            <ul className="mt-3 space-y-3.5">
              {upcoming.map((e) => {
                const meta = TYPE_META[e.type];
                const when = e.date === MOCK_TODAY ? "Hôm nay" : e.date === addDays(MOCK_TODAY, 1) ? "Ngày mai" : `${e.date.slice(8, 10)}/09/2026`;
                return (
                  <li key={e.id}>
                    <button onClick={() => setDetail(e)} className="flex w-full gap-2.5 text-left">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.bg} ${meta.text}`}>
                        {e.type === "class" ? <Monitor className="h-5 w-5" /> : e.type === "assignment" ? <FileText className="h-5 w-5" /> : e.type === "quiz" ? <CalendarDays className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                      </span>
                      <span className="min-w-0">
                        <b className="block truncate text-[12.5px]">{e.type === "class" ? e.course === "WEB301" ? "Lập trình Web nâng cao" : e.title : e.title}</b>
                        <span className="block text-[11px] text-slate-400">{when}, {e.start}{e.end !== e.start && e.end !== "23:59" ? ` - ${e.end}` : e.end === "23:59" ? " 23:59" : ""}</span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400"><MapPin className="h-3 w-3" /> {e.room || e.course}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="text-[15px] font-extrabold">Hiển thị trên lịch</h2>
            <ul className="mt-2.5 space-y-2.5">
              {(Object.keys(TYPE_META) as WeekEventType[]).map((t) => (
                <li key={t}>
                  <button onClick={() => setVisible((v) => ({ ...v, [t]: !v[t] }))} className="flex w-full items-center gap-2.5 text-[13px] font-medium">
                    <span className={`grid h-5 w-5 place-items-center rounded-md text-[11px] font-bold text-white ${visible[t] ? TYPE_META[t].check : "bg-slate-200"}`}>
                      {visible[t] ? "✓" : ""}
                    </span>
                    {TYPE_META[t].label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ""}>
        {detail && (
          <div className="space-y-2 text-sm">
            <p><span className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-medium ${TYPE_META[detail.type].bg} ${TYPE_META[detail.type].text}`}>{TYPE_META[detail.type].label}</span></p>
            <p className="text-slate-600">📅 {detail.date.slice(8, 10)}/09/2026 • 🕐 {detail.start}{detail.end !== detail.start ? ` - ${detail.end}` : ""}</p>
            <p className="text-slate-600">📍 {detail.room || "Trực tuyến"} • {detail.course}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setDetail(null); showToast("Đã thêm vào lịch cá nhân (demo)"); }} className="rounded-lg border border-blue-200 px-4 py-2 font-semibold text-blue-600 hover:bg-blue-50">+ Thêm vào lịch</button>
              <button onClick={() => setDetail(null)} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700">Đóng</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={allOpen} onClose={() => setAllOpen(false)} title="Tất cả sự kiện sắp tới" widthClass="max-w-[520px]">
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {[...shown].filter((e) => e.date >= MOCK_TODAY).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map((e) => (
            <li key={e.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[13px]">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_META[e.type].check}`} />
              <span className="min-w-0 flex-1"><b className="block truncate">{e.title}</b><span className="text-[11.5px] text-slate-400">{e.date.slice(8, 10)}/09 • {e.start} • {e.room || e.course}</span></span>
            </li>
          ))}
        </ul>
      </Modal>

      <Toast message={toast} />
    </StudentShell>
  );
}

function fmt(h: number) {
  return String(h).padStart(2, "0");
}
