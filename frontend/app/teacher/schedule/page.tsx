"use client";

import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import Modal from "../components/Modal";
import { RowMenu } from "../components/work-shared";
import {
  SCHEDULE_TODAY,
  scheduleClassOptions,
  scheduleCourseOptions,
  scheduleEvents,
  scheduleStatusOptions,
  scheduleTypeOptions,
} from "@/lib/mock/teacher-schedule";
import type { ScheduleItem, ScheduleKind } from "@/lib/types/teacher";

/* ---------- helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fmtDMY = (key: string) => key.split("-").reverse().join("/");
const monthLabel = (y: number, m: number) => `Tháng ${m + 1}, ${y}`;
const WD_FULL = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const WD_MINI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const KIND_MAP: Record<string, ScheduleKind> = {
  "Bài tập": "assignment",
  "Kiểm tra": "quiz",
  "Hoạt động lớp học": "class",
  "Sự kiện khác": "other",
};
const KIND_META: Record<ScheduleKind, { label: string; dot: string; pill: string; soft: string; text: string }> = {
  assignment: { label: "Bài tập", dot: "bg-red-500", pill: "bg-red-50 text-red-600", soft: "bg-red-50", text: "text-red-600" },
  quiz: { label: "Kiểm tra", dot: "bg-purple-600", pill: "bg-purple-50 text-purple-700", soft: "bg-purple-50", text: "text-purple-700" },
  class: { label: "Hoạt động lớp học", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700", soft: "bg-amber-50", text: "text-amber-700" },
  other: { label: "Sự kiện khác", dot: "bg-green-500", pill: "bg-green-50 text-green-700", soft: "bg-green-50", text: "text-green-700" },
};
const isDone = (date: string) => date < SCHEDULE_TODAY;

function timeRange(ev: ScheduleItem) {
  return ev.endTime ? `${ev.startTime} - ${ev.endTime}` : ev.startTime;
}

function downloadICS(events: ScheduleItem[]) {
  const stamp = "20260915T000000";
  const body = events
    .map((e) => {
      const d = e.date.replaceAll("-", "");
      const s = e.startTime.replace(":", "") + "00";
      const end = e.endTime ? e.endTime.replace(":", "") + "00" : `${e.startTime.slice(0, 2)}0000`;
      return ["BEGIN:VEVENT", `UID:${e.id}@edulearn`, `DTSTAMP:${stamp}`, `DTSTART:${d}T${s}`, `DTEND:${d}T${end}`, `SUMMARY:${e.title}`, `DESCRIPTION:${e.classCode} - ${e.className}`, "END:VEVENT"].join("\r\n");
    })
    .join("\r\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EduLearn//Teacher Schedule//VI", "CALSCALE:GREGORIAN", body, "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lich-giang-day.ics";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- form thêm / sửa ---------- */
function EventForm({
  initial,
  presetDate,
  onClose,
  onSubmit,
}: {
  initial?: ScheduleItem | null;
  presetDate: string;
  onClose: () => void;
  onSubmit: (v: { title: string; date: string; startTime: string; endTime: string; kind: ScheduleKind; classCode: string }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? presetDate);
  const [start, setStart] = useState(initial?.startTime ?? "08:00");
  const [end, setEnd] = useState(initial?.endTime ?? "");
  const [kind, setKind] = useState<ScheduleKind>(initial?.kind ?? "class");
  const [classCode, setClassCode] = useState(initial?.classCode ?? "WEB301");
  const [error, setError] = useState("");

  return (
    <div className="space-y-3.5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Tên sự kiện *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Họp lớp"
          className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Ngày (yyyy-MM-dd) *</label>
          <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="2026-09-20"
            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Loại sự kiện</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as ScheduleKind)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
            {(Object.keys(KIND_META) as ScheduleKind[]).map((k) => (<option key={k} value={k}>{KIND_META[k].label}</option>))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Bắt đầu (HH:MM) *</label>
          <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="10:00"
            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Kết thúc (để trống nếu không có)</label>
          <input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="11:00"
            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Lớp học</label>
        <select value={classCode} onChange={(e) => setClassCode(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
          {scheduleClassOptions.filter((o) => o.code !== "ALL").map((o) => (<option key={o.code} value={o.code}>{o.name} ({o.code})</option>))}
        </select>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onClick={() => {
          if (title.trim().length < 3) { setError("Tên sự kiện ít nhất 3 ký tự."); return; }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) { setError("Ngày theo định dạng yyyy-MM-dd."); return; }
          if (!/^\d{2}:\d{2}$/.test(start.trim())) { setError("Giờ bắt đầu theo định dạng HH:MM."); return; }
          if (end.trim() && !/^\d{2}:\d{2}$/.test(end.trim())) { setError("Giờ kết thúc theo định dạng HH:MM."); return; }
          if (end.trim() && end.trim() <= start.trim()) { setError("Giờ kết thúc phải sau giờ bắt đầu."); return; }
          onSubmit({ title: title.trim(), date: date.trim(), startTime: start.trim(), endTime: end.trim(), kind, classCode });
        }} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          {initial ? "Lưu" : "Thêm sự kiện"}
        </button>
      </div>
    </div>
  );
}

type ViewMode = "month" | "week" | "day" | "list";

export default function TeacherSchedulePage() {
  const [topSearch, setTopSearch] = useState("");
  const [classCode, setClassCode] = useState("WEB301");
  const [classOpen, setClassOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState(scheduleCourseOptions[0]);
  const [typeFilter, setTypeFilter] = useState(scheduleTypeOptions[0]);
  const [statusFilter, setStatusFilter] = useState(scheduleStatusOptions[0]);
  const [view, setView] = useState<ViewMode>("month");
  const [viewYM, setViewYM] = useState({ y: 2026, m: 8 });
  const [selectedKey, setSelectedKey] = useState(SCHEDULE_TODAY);
  const [events, setEvents] = useState<ScheduleItem[]>(scheduleEvents);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [detail, setDetail] = useState<ScheduleItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  };

  /* ---- lọc ---- */
  const filtered = useMemo(() => {
    const q = topSearch.trim().toLowerCase();
    let list = [...events];
    if (classCode !== "ALL") list = list.filter((e) => e.classCode === classCode);
    if (courseFilter !== "Tất cả khóa học") list = list.filter((e) => e.courseName === courseFilter);
    if (typeFilter !== "Tất cả loại") list = list.filter((e) => e.kind === KIND_MAP[typeFilter]);
    if (statusFilter === "Sắp diễn ra") list = list.filter((e) => !isDone(e.date));
    if (statusFilter === "Đã kết thúc") list = list.filter((e) => isDone(e.date));
    if (q) list = list.filter((e) => `${e.title} ${e.classCode} ${e.className}`.toLowerCase().includes(q));
    return list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }, [events, classCode, courseFilter, typeFilter, statusFilter, topSearch]);

  const stats = useMemo(
    () => ({
      total: events.length,
      assignment: events.filter((e) => e.kind === "assignment").length,
      quiz: events.filter((e) => e.kind === "quiz").length,
      class: events.filter((e) => e.kind === "class").length,
    }),
    [events],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const e of filtered) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [filtered]);

  const selParts = selectedKey.split("-").map(Number);
  const selY = selParts[0];
  const selM = selParts[1] - 1;
  const selD = selParts[2];
  const dayEvents = byDate.get(selectedKey) ?? [];
  const upcoming = filtered.filter((e) => e.date + e.startTime >= selectedKey + "00:00" && e.date !== selectedKey).slice(0, 3);

  /* ---- lưới tháng ---- */
  const monthCells = useMemo(() => {
    const { y, m } = viewYM;
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7; // Thứ 2 đầu tuần
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const cells: { key: string; day: number; inMonth: boolean }[] = [];
    for (let i = lead - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      cells.push({ key: toKey(py, pm, d), day: d, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ key: toKey(y, m, d), day: d, inMonth: true });
    let nd = 1;
    while (cells.length % 7 !== 0) {
      const nm = m === 11 ? 0 : m + 1;
      const ny = m === 11 ? y + 1 : y;
      cells.push({ key: toKey(ny, nm, nd), day: nd, inMonth: false });
      nd++;
    }
    return cells;
  }, [viewYM]);

  /* ---- tuần chứa ngày chọn ---- */
  const weekKeys = useMemo(() => {
    const base = new Date(selY, selM, selD);
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return toKey(d.getFullYear(), d.getMonth(), d.getDate());
    });
  }, [selY, selM, selD]);

  const shift = (dir: 1 | -1) => {
    if (view === "month") setViewYM((v) => ({ y: v.m + dir < 0 ? v.y - 1 : v.m + dir > 11 ? v.y + 1 : v.y, m: (v.m + dir + 12) % 12 }));
    else if (view === "week" || view === "day") {
      const step = view === "week" ? 7 * dir : dir;
      const d = new Date(selY, selM, selD + step);
      const key = toKey(d.getFullYear(), d.getMonth(), d.getDate());
      setSelectedKey(key);
      setViewYM({ y: d.getFullYear(), m: d.getMonth() });
    }
  };
  const goToday = () => {
    setSelectedKey(SCHEDULE_TODAY);
    setViewYM({ y: 2026, m: 8 });
  };
  const pickDate = (key: string) => {
    setSelectedKey(key);
    const [y, m] = key.split("-").map(Number);
    setViewYM({ y, m: m - 1 });
  };

  const submitForm = (v: { title: string; date: string; startTime: string; endTime: string; kind: ScheduleKind; classCode: string }) => {
    const cls = scheduleClassOptions.find((o) => o.code === v.classCode);
    if (editing) {
      setEvents((p) => p.map((e) => (e.id === editing.id ? { ...e, ...v, endTime: v.endTime || undefined, className: cls?.name ?? e.className, courseName: cls?.name ?? e.courseName } : e)));
      showToast("Đã lưu sự kiện");
      setEditing(null);
    } else {
      setEvents((p) => [...p, { id: `ev-${Date.now()}`, title: v.title, date: v.date, startTime: v.startTime, endTime: v.endTime || undefined, kind: v.kind, classCode: v.classCode, className: cls?.name ?? v.classCode, courseName: cls?.name ?? v.classCode }].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)));
      showToast("Đã thêm sự kiện");
      pickDate(v.date);
    }
    setFormOpen(false);
  };
  const deleteEvent = (id: string) => {
    setEvents((p) => p.filter((e) => e.id !== id));
    setDetail(null);
    setConfirmDelete(false);
    showToast("Đã xóa sự kiện");
  };

  const clsOpt = scheduleClassOptions.find((o) => o.code === classCode) ?? scheduleClassOptions[0];

  const viewTitle =
    view === "month" ? monthLabel(viewYM.y, viewYM.m)
    : view === "week" ? `Tuần ${fmtDMY(weekKeys[0])} - ${fmtDMY(weekKeys[6])}`
    : view === "day" ? fmtDMY(selectedKey)
    : "Danh sách sự kiện";

  const statCards = [
    { label: "Tổng sự kiện", value: stats.total, icon: CalendarDays, cls: "bg-blue-50 text-blue-600" },
    { label: "Hạn nộp bài tập", value: stats.assignment, icon: FileText, cls: "bg-red-50 text-red-500" },
    { label: "Hạn kiểm tra", value: stats.quiz, icon: FileText, cls: "bg-purple-50 text-purple-600" },
    { label: "Hoạt động lớp học", value: stats.class, icon: Users, cls: "bg-orange-50 text-orange-500" },
  ];

  const openDetail = (e: ScheduleItem) => {
    setDetail(e);
    setConfirmDelete(false);
  };

  const pill = (e: ScheduleItem) => {
    const meta = KIND_META[e.kind];
    return (
      <span key={e.id} role="button" tabIndex={0}
        onClick={(ev) => { ev.stopPropagation(); openDetail(e); }}
        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); openDetail(e); } }}
        className={`block w-full cursor-pointer truncate rounded-md px-1.5 py-1 text-left text-[11px] leading-tight transition hover:brightness-95 ${meta.soft} ${meta.text}`}>
        <span className="flex items-center gap-1 font-medium"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} /><span className="truncate">{e.title}</span></span>
        <span className="mt-0.5 block pl-2.5 text-[10.5px] opacity-80">{timeRange(e)}</span>
      </span>
    );
  };

  return (
    <TeacherShell activeId="schedule" searchPlaceholder="Tìm kiếm học sinh, lớp học, bài tập, kiểm tra..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Lịch</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Xem và quản lý các sự kiện, thời hạn của bài tập, kiểm tra và các hoạt động lớp học</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => { downloadICS(filtered); showToast(`Đã xuất ${filtered.length} sự kiện (ICS)`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-blue-600 hover:bg-blue-50">
            <Download className="h-4 w-4" /> Xuất lịch (ICS)
          </button>
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Thêm sự kiện
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${s.cls}`}><s.icon className="h-6 w-6" /></span>
            <span><span className="block text-[13px] text-slate-500">{s.label}</span><span className="block text-[22px] font-extrabold">{s.value}</span></span>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/70 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <span className="relative block">
          <span className="mb-1 block text-[12.5px] text-slate-500">Lớp học</span>
          <button onClick={() => setClassOpen((v) => !v)} className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-blue-300">
            <span className="grid h-9 w-12 shrink-0 place-items-center rounded-md bg-gradient-to-br from-amber-100 to-stone-300 text-lg">💻</span>
            <span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{clsOpt.name}</b><span className="block truncate text-[11.5px] text-slate-400">{clsOpt.code === "ALL" ? "Mọi lớp" : clsOpt.desc}</span></span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
          {classOpen && (
            <span className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {scheduleClassOptions.map((o) => (
                <button key={o.code} onClick={() => { setClassCode(o.code); setClassOpen(false); }} className={`block w-full px-3.5 py-2 text-left hover:bg-slate-50 ${o.code === classCode ? "bg-blue-50/60" : ""}`}>
                  <span className={`block text-[13px] font-bold ${o.code === classCode ? "text-blue-700" : "text-slate-700"}`}>{o.name}</span>
                  {o.desc && <span className="block text-[11.5px] text-slate-400">{o.desc}</span>}
                </button>
              ))}
            </span>
          )}
        </span>
        {([
          ["Khóa học", courseFilter, setCourseFilter, scheduleCourseOptions],
          ["Loại sự kiện", typeFilter, setTypeFilter, scheduleTypeOptions],
          ["Trạng thái", statusFilter, setStatusFilter, scheduleStatusOptions],
        ] as const).map(([label, value, set, options]) => (
          <label key={label} className="block text-[12.5px] text-slate-500">
            <span className="mb-1 block">{label}</span>
            <select value={value} onChange={(e) => set(e.target.value)} className="h-[58px] w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none">
              {options.map((o) => (<option key={o}>{o}</option>))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Lịch chính */}
        <section className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1">
              <button onClick={() => shift(-1)} aria-label="Trước" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => shift(1)} aria-label="Sau" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
            </span>
            <button onClick={goToday} className="rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Hôm nay</button>
            <h2 className="ml-1 text-[17px] font-extrabold">{viewTitle}</h2>
            <span className="ml-auto flex overflow-hidden rounded-lg border border-slate-200">
              {(["month", "week", "day", "list"] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setView(m)} className={`px-3.5 py-2 text-[13px] font-medium transition ${view === m ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                  {m === "month" ? "Tháng" : m === "week" ? "Tuần" : m === "day" ? "Ngày" : "Danh sách"}
                </button>
              ))}
            </span>
          </div>

          {view === "month" && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80">
              <div className="grid grid-cols-7 bg-white">
                {WD_FULL.map((w) => (<span key={w} className="border-b border-slate-200/80 px-2 py-2.5 text-center text-[12.5px] font-medium text-slate-500">{w}</span>))}
              </div>
              <div className="grid grid-cols-7">
                {monthCells.map((c) => {
                  const evs = byDate.get(c.key) ?? [];
                  const isSel = c.key === selectedKey;
                  return (
                    <button key={c.key} onClick={() => pickDate(c.key)}
                      className={`min-h-[96px] border-b border-r border-slate-100 p-1.5 text-left align-top transition last:border-r-0 hover:bg-blue-50/40 [&:nth-child(7n)]:border-r-0 ${isSel ? "bg-blue-50/70" : c.inMonth ? "bg-white" : "bg-slate-50/60"}`}>
                      <span className={`inline-grid h-6 min-w-6 place-items-center rounded-md px-1 text-[12px] font-medium ${isSel ? "bg-blue-600 font-bold text-white" : c.inMonth ? "text-slate-600" : "text-slate-300"}`}>{c.day}</span>
                      <span className="mt-1 space-y-1">
                        {evs.slice(0, 2).map((e) => pill(e))}
                        {evs.length > 2 && (
                          <span onClick={(ev) => { ev.stopPropagation(); pickDate(c.key); setView("day"); }} className="block cursor-pointer px-1.5 text-[11px] font-medium text-blue-600 hover:underline">+{evs.length - 2} nữa</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-3 py-3 text-[12.5px] text-slate-500">
                {(Object.keys(KIND_META) as ScheduleKind[]).map((k) => (
                  <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${KIND_META[k].dot}`} /> {KIND_META[k].label}</span>
                ))}
              </div>
            </div>
          )}

          {view === "week" && (
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {weekKeys.map((key, i) => {
                const evs = byDate.get(key) ?? [];
                const isSel = key === selectedKey;
                return (
                  <button key={key} onClick={() => pickDate(key)} className={`min-h-[280px] rounded-xl border p-1.5 text-left transition ${isSel ? "border-blue-300 bg-blue-50/60" : "border-slate-200/70 bg-white hover:border-blue-200"}`}>
                    <span className="block text-center text-[11px] text-slate-400">{WD_MINI[i]}</span>
                    <span className={`mx-auto mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold ${key === SCHEDULE_TODAY ? "bg-blue-600 text-white" : "text-slate-700"}`}>{Number(key.slice(8, 10))}</span>
                    <span className="mt-1.5 space-y-1">{evs.map((e) => pill(e))}</span>
                  </button>
                );
              })}
            </div>
          )}

          {view === "day" && (
            <div className="mt-3">
              {dayEvents.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-10 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">Ngày {fmtDMY(selectedKey)} chưa có sự kiện.</p>
                  <button onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Thêm sự kiện</button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {dayEvents.map((e) => {
                    const meta = KIND_META[e.kind];
                    return (
                      <li key={e.id}>
                        <button onClick={() => { setDetail(e); setConfirmDelete(false); }} className="flex w-full items-center gap-3 rounded-xl border border-slate-200/70 p-3 text-left transition hover:border-blue-200 hover:shadow-md hover:shadow-blue-50">
                          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${meta.soft} ${meta.text}`}>
                            {e.kind === "class" ? <Users className="h-5 w-5" /> : e.kind === "other" ? <CalendarPlus className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-bold">{e.title}</span>
                            <span className="mt-0.5 block text-[12.5px] text-slate-500">{e.classCode} - {e.className}</span>
                          </span>
                          <span className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11.5px] font-medium ${meta.pill}`}>{meta.label}</span>
                          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[12.5px] text-slate-500"><Clock className="h-3.5 w-3.5 shrink-0" /> {timeRange(e)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {view === "list" && (
            <ul className="mt-3 space-y-2.5">
              {filtered.map((e) => {
                const meta = KIND_META[e.kind];
                const done = isDone(e.date);
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 p-3 transition hover:border-blue-200 sm:flex-nowrap">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-center">
                      <span><b className="block text-[16px] leading-none text-blue-700">{e.date.slice(8, 10)}</b><span className="text-[10px] text-slate-400">Th{e.date.slice(5, 7)}</span></span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold">{e.title}</span>
                      <span className="mt-0.5 block text-[12.5px] text-slate-500">{e.classCode} - {e.className} • {timeRange(e)}{e.location ? ` • ${e.location}` : ""}</span>
                    </span>
                    <span className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11.5px] font-medium ${meta.pill}`}>{meta.label}</span>
                    <span className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11.5px] font-medium ${done ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600"}`}>{done ? "Đã kết thúc" : "Sắp diễn ra"}</span>
                    <RowMenu items={[
                      { label: "Xem chi tiết", onClick: () => { setDetail(e); setConfirmDelete(false); } },
                      { label: "Chỉnh sửa", onClick: () => { setEditing(e); setFormOpen(true); } },
                      { label: "Xóa", danger: true, onClick: () => deleteEvent(e.id) },
                    ]} />
                  </li>
                );
              })}
              {filtered.length === 0 && <li className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Không có sự kiện nào khớp bộ lọc.</li>}
            </ul>
          )}
        </section>

        {/* Cột phải */}
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">{monthLabel(viewYM.y, viewYM.m)}</h2>
              <span className="flex gap-1">
                <button onClick={() => shift(-1)} aria-label="Tháng trước" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => shift(1)} aria-label="Tháng sau" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
              {WD_MINI.map((w) => (<span key={w} className="py-1">{w}</span>))}
            </div>
            <div className="grid grid-cols-7 text-center text-[12.5px]">
              {monthCells.map((c) => {
                const evs = byDate.get(c.key) ?? [];
                const isSel = c.key === selectedKey;
                return (
                  <button key={c.key} onClick={() => pickDate(c.key)}
                    className={`relative mx-auto grid h-8 w-8 place-items-center rounded-lg transition ${isSel ? "bg-blue-600 font-bold text-white shadow-sm shadow-blue-600/40" : c.inMonth ? "text-slate-600 hover:bg-slate-100" : "text-slate-300"}`}>
                    {c.day}
                    {evs.length > 0 && !isSel && (
                      <span className="absolute bottom-1 flex gap-0.5">
                        {evs.slice(0, 3).map((e) => (<span key={e.id} className={`h-1 w-1 rounded-full ${KIND_META[e.kind].dot}`} />))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">Sự kiện trong ngày</h2>
              <span className="text-[12px] text-blue-600">{fmtDMY(selectedKey)}</span>
            </div>
            <ul className="mt-3 space-y-3">
              {dayEvents.length === 0 && <li className="text-[13px] text-slate-400">Không có sự kiện nào.</li>}
              {dayEvents.map((e) => {
                const meta = KIND_META[e.kind];
                return (
                  <li key={e.id}>
                    <button onClick={() => { setDetail(e); setConfirmDelete(false); }} className="flex w-full items-start gap-2.5 text-left">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.soft} ${meta.text}`}>
                        {e.kind === "class" ? <Users className="h-5 w-5" /> : e.kind === "other" ? <CalendarPlus className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <b className="text-[13px] leading-snug">{e.title}</b>
                          <span className="shrink-0 text-[11.5px] text-slate-400">{e.startTime}{e.endTime ? ` - ${e.endTime}` : ""}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-slate-400">Lớp: {e.classCode} - {e.className}</span>
                        <span className={`mt-1 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">Sắp tới</h2>
              <button onClick={() => setView("list")} className="text-[12.5px] font-medium text-blue-600 hover:text-blue-700">Xem tất cả</button>
            </div>
            <ul className="mt-3 space-y-3">
              {upcoming.length === 0 && <li className="text-[13px] text-slate-400">Không còn sự kiện nào sau ngày này.</li>}
              {upcoming.map((e) => {
                const meta = KIND_META[e.kind];
                return (
                  <li key={e.id}>
                    <button onClick={() => { setDetail(e); setConfirmDelete(false); }} className="flex w-full items-start gap-2.5 text-left">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.soft} ${meta.text}`}><FileText className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[13px]">{e.title}</b>
                        <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-slate-400"><CalendarDays className="h-3 w-3" /> {fmtDMY(e.date)} {timeRange(e)}</span>
                      </span>
                      <span className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {/* Modal thêm/sửa */}
      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} title={editing ? "Chỉnh sửa sự kiện" : "Thêm sự kiện mới"}>
        <EventForm key={editing ? editing.id : `${formOpen}-${selectedKey}`} initial={editing} presetDate={selectedKey} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={submitForm} />
      </Modal>

      {/* Modal chi tiết */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết sự kiện">
        {detail && (
          <div className="space-y-2.5 text-sm">
            <p className="text-[16px] font-bold">{detail.title}</p>
            <p><span className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-medium ${KIND_META[detail.kind].pill}`}>{KIND_META[detail.kind].label}</span></p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Ngày</p><p className="font-bold">{fmtDMY(detail.date)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Giờ</p><p className="font-bold">{timeRange(detail)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Lớp</p><p className="font-bold">{detail.classCode}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Địa điểm</p><p className="font-bold">{detail.location ?? "—"}</p></div>
            </div>
            {!confirmDelete ? (
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Xóa</button>
                <button onClick={() => { setEditing(detail); setDetail(null); setFormOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /> Sửa</button>
                <button onClick={() => setDetail(null)} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Đóng</button>
              </div>
            ) : (
              <div className="rounded-xl bg-red-50 p-3.5 text-sm">
                <p className="font-semibold text-red-700">Xóa sự kiện này? Không thể hoàn tác.</p>
                <div className="mt-2.5 flex justify-end gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-600 shadow-sm">Hủy</button>
                  <button onClick={() => deleteEvent(detail.id)} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">Xác nhận xóa</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Toast message={toast} />
    </TeacherShell>
  );
}
