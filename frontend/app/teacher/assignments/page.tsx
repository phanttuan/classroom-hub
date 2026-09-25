"use client";

import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Clock,
  FileText,
  Play,
  Plus,
  Search,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import Modal from "../components/Modal";
import {
  FilterSelect,
  Pagination,
  RowMenu,
  SubmitProgress,
  TONE_BOX,
  WorkStatusBadge,
} from "../components/work-shared";
import {
  assignmentClassOptions,
  assignmentCourseOptions,
  assignmentList,
  assignmentSortOptions,
  assignmentStatusOptions,
} from "@/lib/mock/teacher-assignments";
import type { TeacherAssignment, WorkStatus } from "@/lib/types/teacher";

const STATUS_MAP: Record<string, WorkStatus> = {
  "Đang mở": "open",
  "Sắp đến hạn": "due-soon",
  "Đã đóng": "closed",
};

function parseDate(s: string) {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function AssignmentForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: TeacherAssignment | null;
  onClose: () => void;
  onSubmit: (v: { title: string; description: string; classCode: string; courseName: string; dueDate: string; maxScore: number }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [classCode, setClassCode] = useState(initial?.classCode ?? "WEB301");
  const [courseName, setCourseName] = useState(initial?.courseName ?? "Lập trình Web nâng cao");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "30/09/2026");
  const [maxScore, setMaxScore] = useState(String(initial?.maxScore ?? 100));
  const [error, setError] = useState("");

  return (
    <div className="space-y-3.5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Tên bài tập *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bài tập 7: React cơ bản"
          className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Mô tả</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Mô tả ngắn..."
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Lớp học</label>
          <select value={classCode} onChange={(e) => setClassCode(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
            {assignmentClassOptions.filter((o) => o !== "Tất cả lớp học").map((o) => (<option key={o}>{o}</option>))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Điểm tối đa</label>
          <input value={maxScore} onChange={(e) => setMaxScore(e.target.value)} inputMode="numeric"
            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Khóa học</label>
          <select value={courseName} onChange={(e) => setCourseName(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
            {assignmentCourseOptions.filter((o) => o !== "Tất cả khóa học").map((o) => (<option key={o}>{o}</option>))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Hạn nộp (dd/MM/yyyy)</label>
          <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="30/09/2026"
            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onClick={() => {
          if (title.trim().length < 3) { setError("Tên bài tập ít nhất 3 ký tự."); return; }
          if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dueDate.trim())) { setError("Hạn nộp theo định dạng dd/MM/yyyy."); return; }
          const ms = Number(maxScore);
          if (!Number.isFinite(ms) || ms <= 0) { setError("Điểm tối đa phải là số dương."); return; }
          onSubmit({ title: title.trim(), description: desc.trim() || "Chưa có mô tả.", classCode, courseName, dueDate: dueDate.trim(), maxScore: ms });
        }} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          {initial ? "Lưu" : "Tạo bài tập"}
        </button>
      </div>
    </div>
  );
}

export default function TeacherAssignmentsPage() {
  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState(assignmentClassOptions[0]);
  const [courseFilter, setCourseFilter] = useState(assignmentCourseOptions[0]);
  const [statusFilter, setStatusFilter] = useState(assignmentStatusOptions[0]);
  const [sort, setSort] = useState(assignmentSortOptions[0]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TeacherAssignment[]>(assignmentList);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherAssignment | null>(null);
  const [detail, setDetail] = useState<TeacherAssignment | null>(null);
  const [deleting, setDeleting] = useState<TeacherAssignment | null>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  };
  const resetPage = () => setPage(1);

  const stats = useMemo(
    () => ({
      total: items.length,
      open: items.filter((i) => i.status === "open").length,
      dueSoon: items.filter((i) => i.status === "due-soon").length,
      closed: items.filter((i) => i.status === "closed").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...items];
    if (classFilter !== "Tất cả lớp học") list = list.filter((i) => i.classCode === classFilter);
    if (courseFilter !== "Tất cả khóa học") list = list.filter((i) => i.courseName === courseFilter);
    if (statusFilter !== "Tất cả trạng thái") list = list.filter((i) => i.status === STATUS_MAP[statusFilter]);
    if (q) list = list.filter((i) => `${i.title} ${i.description} ${i.classCode}`.toLowerCase().includes(q));
    if (sort === "Hạn nộp gần nhất") list.sort((a, b) => parseDate(a.dueDate) - parseDate(b.dueDate));
    if (sort === "Nộp nhiều nhất") list.sort((a, b) => b.submitted / b.total - a.submitted / a.total);
    return list;
  }, [items, classFilter, courseFilter, statusFilter, query, topSearch, sort]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  const submitForm = (v: { title: string; description: string; classCode: string; courseName: string; dueDate: string; maxScore: number }) => {
    if (editing) {
      setItems((p) => p.map((x) => (x.id === editing.id ? { ...x, ...v } : x)));
      showToast("Đã lưu bài tập");
      setEditing(null);
    } else {
      const tones = ["red", "blue", "green", "purple", "orange"] as const;
      setItems((p) => [
        { id: `bt-${Date.now()}`, ...v, status: "open", submitted: 0, total: 42, tone: tones[p.length % tones.length] },
        ...p,
      ]);
      showToast("Đã tạo bài tập");
    }
    setCreateOpen(false);
  };

  const toggleStatus = (it: TeacherAssignment) => {
    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, status: x.status === "closed" ? "open" : "closed" } : x)));
    showToast(it.status === "closed" ? "Đã mở lại bài tập" : "Đã đóng bài tập");
  };

  const statCards = [
    { label: "Tổng bài tập", value: stats.total, icon: FileText, cls: "bg-blue-50 text-blue-600" },
    { label: "Đang mở", value: stats.open, icon: Play, cls: "bg-green-50 text-green-600" },
    { label: "Sắp đến hạn", value: stats.dueSoon, icon: Clock, cls: "bg-orange-50 text-orange-500" },
    { label: "Đã đóng", value: stats.closed, icon: FileText, cls: "bg-red-50 text-red-500" },
  ];

  return (
    <TeacherShell activeId="assignments" searchPlaceholder="Tìm kiếm lớp học, khóa học, bài tập, sinh viên..." searchValue={topSearch} onSearchChange={(v) => { setTopSearch(v); resetPage(); }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Bài tập</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Tạo và quản lý bài tập cho các lớp học của bạn</p>
        </div>
        <button onClick={() => { setEditing(null); setCreateOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Tạo bài tập
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${s.cls}`}><s.icon className="h-6 w-6" /></span>
            <span><span className="block text-[13px] text-slate-500">{s.label}</span>
            <span className="block text-[22px] font-extrabold">{s.value}</span></span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200/70 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
          <FilterSelect label="Lớp học" value={classFilter} onChange={(v) => { setClassFilter(v); resetPage(); }} options={assignmentClassOptions} />
          <FilterSelect label="Khóa học" value={courseFilter} onChange={(v) => { setCourseFilter(v); resetPage(); }} options={assignmentCourseOptions} />
          <FilterSelect label="Trạng thái" value={statusFilter} onChange={(v) => { setStatusFilter(v); resetPage(); }} options={assignmentStatusOptions} />
          <label className="block text-[12.5px] text-slate-500">
            <span className="mb-1 block">&nbsp;</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => { setQuery(e.target.value); resetPage(); }} placeholder="Tìm kiếm bài tập..."
                className="h-10 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
            </span>
          </label>
          <label className="block text-[12.5px] text-slate-500">
            <span className="mb-1 block">&nbsp;</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none">
              {assignmentSortOptions.map((o) => (<option key={o}>Sắp xếp: {o}</option>))}
            </select>
          </label>
        </div>

        <ul className="mt-4 space-y-3">
          {pageItems.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 p-3.5 transition hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 sm:flex-nowrap sm:gap-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${TONE_BOX[it.tone]}`}>
                <FileText className="h-6 w-6" />
              </span>
              <span className="min-w-[200px] flex-[1.4]">
                <span className="block text-[14.5px] font-bold">{it.title}</span>
                <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-slate-500">{it.description}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-slate-500">
                  <span>Lớp: {it.classCode}</span>
                  <span>Khóa học: {it.courseName}</span>
                </span>
              </span>
              <span className="flex w-[140px] shrink-0 flex-col items-center py-0.5 text-center">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span className="mt-1 whitespace-nowrap text-[11.5px] leading-tight text-slate-400">Hạn nộp</span>
                <b className="whitespace-nowrap text-[13px] font-semibold leading-snug text-slate-700">{it.dueDate} 23:59</b>
              </span>
              <span className="flex w-[110px] shrink-0 flex-col items-center py-0.5 text-center">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="mt-1 whitespace-nowrap text-[11.5px] leading-tight text-slate-400">Điểm tối đa</span>
                <b className="whitespace-nowrap text-[13px] font-semibold leading-snug text-slate-700">{it.maxScore}</b>
              </span>
              <span className="flex w-[110px] shrink-0 justify-center">
                <WorkStatusBadge status={it.status} />
              </span>
              <SubmitProgress done={it.submitted} total={it.total} label="Đã nộp" />
              <span className="flex shrink-0 items-center gap-2">
                <RowMenu items={[
                  { label: "Xem chi tiết", onClick: () => setDetail(it) },
                  { label: "Chỉnh sửa", onClick: () => { setEditing(it); setCreateOpen(true); } },
                  { label: it.status === "closed" ? "Mở lại" : "Đóng bài tập", onClick: () => toggleStatus(it) },
                  { label: "Xóa", danger: true, onClick: () => setDeleting(it) },
                ]} />
                <button onClick={() => setDetail(it)} className="whitespace-nowrap rounded-lg border border-blue-200 px-3.5 py-2 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">
                  Xem chi tiết
                </button>
              </span>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Không tìm thấy bài tập nào.</p>}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-500">
          <span>Hiển thị {from} - {to} trong {filtered.length} bài tập</span>
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setEditing(null); }} title={editing ? "Chỉnh sửa bài tập" : "Tạo bài tập mới"}>
        <AssignmentForm key={editing ? editing.id : String(createOpen)} initial={editing} onClose={() => { setCreateOpen(false); setEditing(null); }} onSubmit={submitForm} />
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết bài tập">
        {detail && (
          <div className="space-y-2.5 text-sm">
            <p className="text-[16px] font-bold">{detail.title}</p>
            <p className="text-slate-500">{detail.description}</p>
            <p className="text-slate-500">Lớp {detail.classCode} • {detail.courseName}</p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Hạn nộp</p><p className="font-bold">{detail.dueDate}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Điểm tối đa</p><p className="font-bold">{detail.maxScore}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Đã nộp</p><p className="font-bold">{detail.submitted}/{detail.total}</p></div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { toggleStatus(detail); setDetail(null); }} className="rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">
                {detail.status === "closed" ? "Mở lại" : "Đóng bài tập"}
              </button>
              <button onClick={() => setDetail(null)} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">Mở chấm điểm</button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Xóa bài tập?" widthClass="max-w-[420px]">
        {deleting && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">Xóa <b className="text-slate-900">{deleting.title}</b>? Không thể hoàn tác.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="rounded-lg px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={() => { setItems((p) => p.filter((x) => x.id !== deleting.id)); setDeleting(null); showToast("Đã xóa bài tập"); }} className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700">Xóa</button>
            </div>
          </div>
        )}
      </Modal>
      <Toast message={toast} />
    </TeacherShell>
  );
}
