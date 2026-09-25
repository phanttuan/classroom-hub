"use client";

import Image from "next/image";
import { Fragment, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import Modal from "../components/Modal";
import { RowMenu } from "../components/work-shared";
import {
  gradebookStudents,
  gradeClasses,
  gradeCourseOptions,
  gradeStatusOptions,
  gradeWeightDefault,
  type GradebookStudentWithCourse,
} from "@/lib/mock/teacher-gradebook";
import type { GradeWeight } from "@/lib/types/teacher";

type GradeTab = "overview" | "assignment" | "quiz" | "detail";

const TABS: { id: GradeTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "assignment", label: "Theo bài tập (Assignment)" },
  { id: "quiz", label: "Theo kiểm tra (Quiz)" },
  { id: "detail", label: "Chi tiết điểm" },
];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function total10(s: GradebookStudentWithCourse, w: GradeWeight): number | null {
  if (s.assignmentAvg === null || s.quizAvg === null) return null;
  return round1((s.assignmentAvg * w.assignment + s.quizAvg * w.quiz) / 100);
}
function scoreColor(v: number | null) {
  if (v === null) return "text-slate-400";
  if (v >= 8) return "text-green-600";
  if (v >= 6.5) return "text-amber-500";
  return "text-red-500";
}
function totalPill(v: number | null) {
  if (v === null) return "text-slate-400";
  if (v >= 8) return "bg-green-100/80 text-green-700";
  if (v >= 6.5) return "bg-amber-100/70 text-amber-600";
  return "bg-red-100/80 text-red-600";
}

interface HistoryEntry {
  id: number;
  text: string;
  time: string;
}

export default function TeacherGradesPage() {
  const [topSearch, setTopSearch] = useState("");
  const [classCode, setClassCode] = useState("WEB301");
  const [classOpen, setClassOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState(gradeCourseOptions[0]);
  const [tab, setTab] = useState<GradeTab>("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(gradeStatusOptions[0]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [students, setStudents] = useState<GradebookStudentWithCourse[]>(gradebookStudents);
  const [weights, setWeights] = useState<GradeWeight>(gradeWeightDefault);
  const [selectedId, setSelectedId] = useState("st-003");
  const [checked, setChecked] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "history">("info");
  const [itemTab, setItemTab] = useState<"assignment" | "quiz">("assignment");
  const [weightOpen, setWeightOpen] = useState(false);
  const [wA, setWA] = useState("40");
  const [wQ, setWQ] = useState("60");
  const [wError, setWError] = useState("");
  const [editing, setEditing] = useState<GradebookStudentWithCourse | null>(null);
  const [eA, setEA] = useState("");
  const [eQ, setEQ] = useState("");
  const [eError, setEError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const histId = useRef(1);
  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  };

  const cls = gradeClasses.find((c) => c.code === classCode) ?? gradeClasses[0];

  const classStudents = useMemo(
    () => students.filter((s) => s.classCode === classCode),
    [students, classCode],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = classStudents;
    if (courseFilter !== "Tất cả khóa học") list = list.filter((s) => s.courseName === courseFilter);
    if (statusFilter === "Đã có điểm") list = list.filter((s) => total10(s, weights) !== null);
    if (statusFilter === "Chưa có điểm") list = list.filter((s) => total10(s, weights) === null);
    if (q) list = list.filter((s) => `${s.name} ${s.mssv}`.toLowerCase().includes(q));
    return list;
  }, [classStudents, courseFilter, statusFilter, query, topSearch, weights]);

  const gradedCount = classStudents.filter((s) => total10(s, weights) !== null).length;
  const missingCount = classStudents.length - gradedCount;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  const selected = students.find((s) => s.id === selectedId) ?? pageItems[0] ?? null;

  const showAssignmentCol = tab === "overview" || tab === "assignment" || tab === "detail";
  const showQuizCol = tab === "overview" || tab === "quiz" || tab === "detail";

  const toggleCheck = (id: string) =>
    setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleCheckPage = () => {
    const ids = pageItems.map((s) => s.id);
    setChecked((p) => (ids.every((id) => p.includes(id)) ? p.filter((id) => !ids.includes(id)) : [...new Set([...p, ...ids])]));
  };

  const exportCsv = (rows: GradebookStudentWithCourse[]) => {
    const header = "STT,Ho ten,MSSV,Lop,Bai tap TB,Kiem tra TB,Diem tong\n";
    const body = rows
      .map((s, i) => {
        const t = total10(s, weights);
        return `${i + 1},"${s.name}",${s.mssv},${s.classCode},${s.assignmentAvg ?? ""},${s.quizAvg ?? ""},${t ?? ""}`;
      })
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `so-diem-${classCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${rows.length} dòng điểm (CSV)`);
  };

  const openEdit = (s: GradebookStudentWithCourse) => {
    setEditing(s);
    setEA(s.assignmentAvg === null ? "" : String(s.assignmentAvg));
    setEQ(s.quizAvg === null ? "" : String(s.quizAvg));
    setEError("");
  };
  const saveEdit = () => {
    if (!editing) return;
    const parse = (v: string) => (v.trim() === "" ? null : Number(v));
    const a = parse(eA);
    const q = parse(eQ);
    if ((a !== null && (!Number.isFinite(a) || a < 0 || a > 10)) || (q !== null && (!Number.isFinite(q) || q < 0 || q > 10))) {
      setEError("Điểm phải để trống (chưa có) hoặc trong khoảng 0 - 10.");
      return;
    }
    setStudents((p) =>
      p.map((s) =>
        s.id === editing.id
          ? { ...s, assignmentAvg: a, assignmentTotal: Math.round((a ?? 0) * 4), quizAvg: q, quizTotal: Math.round((q ?? 0) * 6) }
          : s,
      ),
    );
    setHistory((h) => [{ id: histId.current++, text: `Sửa điểm ${editing.name} (${editing.mssv}): BT ${editing.assignmentAvg ?? "-"} → ${a ?? "-"}, KT ${editing.quizAvg ?? "-"} → ${q ?? "-"}`, time: "Vừa xong" }, ...h]);
    setEditing(null);
    showToast(`Đã lưu điểm của ${editing.name}`);
  };

  const saveWeights = () => {
    const a = Number(wA);
    const q = Number(wQ);
    if (!Number.isFinite(a) || !Number.isFinite(q) || a < 0 || q < 0) {
      setWError("Trọng số phải là số không âm.");
      return;
    }
    if (a + q !== 100) {
      setWError(`Tổng hiện tại ${a + q}% — phải bằng 100%.`);
      return;
    }
    setWeights({ assignment: a, quiz: q });
    setWeightOpen(false);
    setHistory((h) => [{ id: histId.current++, text: `Đổi trọng số lớp ${classCode}: Bài tập ${a}%, Kiểm tra ${q}%`, time: "Vừa xong" }, ...h]);
    showToast("Đã cập nhật trọng số điểm");
  };

  return (
    <TeacherShell activeId="grades" searchPlaceholder="Tìm kiếm học sinh, lớp học, bài tập, kiểm tra..." searchValue={topSearch} onSearchChange={(v) => { setTopSearch(v); setPage(1); }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Sổ điểm</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Theo dõi và quản lý điểm của học sinh trong lớp học</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => exportCsv(filtered)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-blue-600 hover:bg-blue-50">
            <Download className="h-4 w-4" /> Xuất Excel
          </button>
          <button onClick={() => { setWA(String(weights.assignment)); setWQ(String(weights.quiz)); setWError(""); setWeightOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700">
            <Settings className="h-4 w-4" /> Cấu hình trọng số
          </button>
        </div>
      </div>

      {/* Chọn lớp */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-3.5">
        <span className="relative">
          <button onClick={() => setClassOpen((v) => !v)} className="flex items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-slate-50">
            <span className="grid h-12 w-16 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-stone-300 text-2xl">💻</span>
            <span>
              <span className="block text-[11px] font-medium text-slate-400">Lớp học <span className="text-red-500">*</span></span>
              <span className="block text-[14px] font-bold">{cls.name}</span>
              <span className="block text-[11.5px] text-slate-400">{cls.code} <span className="mx-0.5">•</span> {cls.studentCount} học sinh</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {classOpen && (
            <span className="absolute left-0 top-[calc(100%+6px)] z-20 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {gradeClasses.map((c) => (
                <button key={c.code} onClick={() => { setClassCode(c.code); setClassOpen(false); setPage(1); setChecked([]); }} className={`block w-full px-4 py-2.5 text-left hover:bg-slate-50 ${c.code === classCode ? "bg-blue-50/60" : ""}`}>
                  <span className={`block text-[13.5px] font-bold ${c.code === classCode ? "text-blue-700" : "text-slate-700"}`}>{c.name}</span>
                  <span className="block text-[12px] text-slate-400">{c.code} • {c.studentCount} học sinh</span>
                </button>
              ))}
            </span>
          )}
        </span>
        <label className="ml-auto block min-w-[220px] text-[12px] text-slate-500">
          <span className="mb-1 block">Lọc theo khóa học</span>
          <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none">
            {gradeCourseOptions.map((o) => (<option key={o}>{o}</option>))}
          </select>
        </label>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-purple-50 text-purple-600"><Users className="h-6 w-6" /></span>
          <span><span className="block text-[13px] text-slate-500">Tổng số học sinh</span><span className="block text-[22px] font-extrabold">{cls.studentCount}</span></span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-green-50 text-green-600"><CheckCircle2 className="h-6 w-6" /></span>
          <span><span className="block text-[13px] text-slate-500">Đã có điểm đầy đủ</span><span className="block text-[22px] font-extrabold">{gradedCount} <span className="text-[13px] font-medium text-slate-400">({Math.round((gradedCount / Math.max(classStudents.length, 1)) * 100)}%)</span></span></span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-500"><Clock className="h-6 w-6" /></span>
          <span><span className="block text-[13px] text-slate-500">Chưa đủ dữ liệu</span><span className="block text-[22px] font-extrabold">{missingCount} <span className="text-[13px] font-medium text-slate-400">({Math.round((missingCount / Math.max(classStudents.length, 1)) * 100)}%)</span></span></span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Bảng điểm */}
        <section className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-4">
          <div className="flex flex-wrap gap-1 border-b border-slate-100">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex items-center gap-1.5 px-3 pb-3 pt-1 text-[13.5px] font-medium ${tab === t.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                <LayoutGrid className="h-4 w-4" />{t.label}
                {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Tìm kiếm theo tên, MSSV..."
                className="h-10 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
            </span>
            <label className="block text-[12px] text-slate-500">
              <span className="mb-0.5 block">Trạng thái</span>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none">
                {gradeStatusOptions.map((o) => (<option key={o}>{o}</option>))}
              </select>
            </label>
          </div>

          {checked.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[13px] text-blue-700">
              Đã chọn {checked.length} học sinh
              <button onClick={() => exportCsv(students.filter((s) => checked.includes(s.id)))} className="ml-1 inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold shadow-sm"><Download className="h-3.5 w-3.5" /> Xuất đã chọn</button>
              <button onClick={() => setChecked([])} className="rounded-md bg-white px-2.5 py-1 font-semibold shadow-sm">Bỏ chọn</button>
            </div>
          )}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="text-[12px] text-slate-500">
                  <th className="px-2 py-2"><input type="checkbox" checked={pageItems.length > 0 && pageItems.every((s) => checked.includes(s.id))} onChange={toggleCheckPage} aria-label="Chọn trang" className="h-4 w-4 accent-blue-600" /></th>
                  <th className="px-2 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Học sinh</th>
                  <th className="px-2 py-2 font-medium">MSSV</th>
                  {showAssignmentCol && <th className="px-2 py-2 text-center font-medium">Bài tập ({weights.assignment}%)<br /><span className="font-normal text-slate-400">TB | Điểm</span></th>}
                  {showQuizCol && <th className="px-2 py-2 text-center font-medium">Kiểm tra ({weights.quiz}%)<br /><span className="font-normal text-slate-400">TB | Điểm</span></th>}
                  <th className="px-2 py-2 text-center font-medium">Điểm tổng<br /><span className="font-normal text-slate-400">(10)</span></th>
                  <th className="px-2 py-2 font-medium">Trạng thái</th>
                  <th className="px-2 py-2 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((s, idx) => {
                  const t = total10(s, weights);
                  const n = (safePage - 1) * pageSize + idx + 1;
                  const isSel = selectedId === s.id;
                  return (
                    <Fragment key={s.id}>
                      <tr className={`transition hover:bg-blue-50/40 ${isSel ? "bg-blue-50/70" : ""}`}>
                        <td className="px-2 py-2.5"><input type="checkbox" checked={checked.includes(s.id)} onChange={() => toggleCheck(s.id)} aria-label={`Chọn ${s.name}`} className="h-4 w-4 accent-blue-600" /></td>
                        <td className="px-2 py-2.5 text-slate-400">{n}</td>
                        <td className="px-2 py-2.5">
                          <button onClick={() => setSelectedId(s.id)} className="flex items-center gap-2 text-left">
                            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200">
                              <Image src={`https://i.pravatar.cc/64?img=${s.avatarImg}`} alt={s.name} width={32} height={32} className="h-full w-full object-cover" unoptimized />
                            </span>
                            <span className="whitespace-nowrap font-medium text-slate-800 hover:text-blue-700">{s.name}</span>
                          </button>
                        </td>
                        <td className="px-2 py-2.5 text-slate-500">{s.mssv}</td>
                        {showAssignmentCol && (
                          <td className="px-2 py-2.5 text-center">
                            <span className={`font-bold ${scoreColor(s.assignmentAvg)}`}>{s.assignmentAvg === null ? "-" : s.assignmentAvg.toFixed(1)}</span>
                            <span className="block text-[11.5px] text-slate-400">{s.assignmentAvg === null ? "0/40" : `${s.assignmentTotal}/${s.assignmentMax}`}</span>
                          </td>
                        )}
                        {showQuizCol && (
                          <td className="px-2 py-2.5 text-center">
                            <span className={`font-bold ${scoreColor(s.quizAvg)}`}>{s.quizAvg === null ? "-" : s.quizAvg.toFixed(1)}</span>
                            <span className="block text-[11.5px] text-slate-400">{s.quizAvg === null ? "0/60" : `${s.quizTotal}/${s.quizMax}`}</span>
                          </td>
                        )}
                        <td className="px-2 py-2.5 text-center">
                          {t === null ? <span className="text-slate-400">-</span> : <span className={`rounded-md px-2 py-1 font-bold ${totalPill(t)}`}>{t.toFixed(1)}</span>}
                        </td>
                        <td className="px-2 py-2.5">
                          {t === null
                            ? <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-[11.5px] font-medium text-slate-500">Chưa có điểm</span>
                            : <span className="whitespace-nowrap rounded-md bg-green-100/70 px-2 py-1 text-[11.5px] font-medium text-green-700">Đã có điểm</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className="inline-flex items-center gap-1">
                            {tab === "detail" && (
                              <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} aria-label="Chi tiết điểm" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                                <ChevronDown className={`h-4 w-4 transition ${expandedId === s.id ? "rotate-180" : ""}`} />
                              </button>
                            )}
                            <RowMenu items={[
                              { label: "Xem chi tiết", onClick: () => { setSelectedId(s.id); setDetailTab("info"); } },
                              { label: "Sửa điểm", onClick: () => openEdit(s) },
                              { label: "Lịch sử chỉnh sửa", onClick: () => { setSelectedId(s.id); setDetailTab("history"); } },
                            ]} />
                          </span>
                        </td>
                      </tr>
                      {tab === "detail" && expandedId === s.id && (
                        <tr className="bg-slate-50/70">
                          <td />
                          <td colSpan={8} className="px-4 py-2.5">
                            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-slate-500">
                              {s.items.map((it) => (
                                <li key={it.itemId}>{it.itemName}: <b className={scoreColor(it.score === null ? null : it.score / it.maxScore * 10)}>{it.score === null ? "-" : it.score}</b>/{it.maxScore}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="mt-3 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Không tìm thấy học sinh nào.</p>}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-500">
            <span>Hiển thị {from} - {to} trong {filtered.length} học sinh</span>
            <span className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Trước" disabled={safePage === 1} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`grid h-8 w-8 place-items-center rounded-lg text-[13px] font-semibold ${p === safePage ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-50"}`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Sau" disabled={safePage === totalPages} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="ml-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] outline-none" aria-label="Số dòng mỗi trang">
                <option value={8}>8 / trang</option>
                <option value={16}>16 / trang</option>
              </select>
            </span>
          </div>
        </section>

        {/* Cột phải */}
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-bold">Cấu hình trọng số điểm</h2>
              <button onClick={() => { setWA(String(weights.assignment)); setWQ(String(weights.quiz)); setWError(""); setWeightOpen(true); }} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-100">
                <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
              </button>
            </div>
            <p className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Bài tập (Assignment)</span><b>{weights.assignment}%</b></p>
            <p className="mt-0.5 text-[12px] text-slate-400">Tính trung bình các bài tập đã chấm</p>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${weights.assignment}%` }} /></span>
            <p className="mt-3 flex items-center justify-between text-[13px]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Kiểm tra trắc nghiệm (Quiz)</span><b>{weights.quiz}%</b></p>
            <p className="mt-0.5 text-[12px] text-slate-400">Tính trung bình các bài kiểm tra đã làm</p>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-purple-500" style={{ width: `${weights.quiz}%` }} /></span>
            <p className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[13.5px] font-bold">Tổng trọng số <span>100%</span></p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-green-600"><CheckCircle2 className="h-4 w-4" /> Trọng số hợp lệ (tổng bằng 100%)</p>
          </section>

          {selected && (
            <section className="rounded-xl border border-slate-200/70 bg-white p-4">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                <button onClick={() => setDetailTab("info")} className={`relative pb-2 text-[13.5px] font-semibold ${detailTab === "info" ? "text-blue-600" : "text-slate-400"}`}>
                  Chi tiết học sinh
                  {detailTab === "info" && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-blue-600" />}
                </button>
                <button onClick={() => setDetailTab("history")} className={`relative pb-2 text-[13.5px] font-medium ${detailTab === "history" ? "text-blue-600" : "text-slate-400"}`}>
                  Lịch sử chỉnh sửa
                  {detailTab === "history" && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-blue-600" />}
                </button>
                <button onClick={() => showToast("Đóng panel (demo)")} aria-label="Đóng" className="ml-auto grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>

              {detailTab === "info" ? (
                <>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200">
                      <Image src={`https://i.pravatar.cc/128?img=${selected.avatarImg}`} alt={selected.name} width={56} height={56} className="h-full w-full object-cover" unoptimized />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold leading-snug">{selected.name}</span>
                      <span className="block whitespace-nowrap text-[12px] text-slate-400">MSSV: {selected.mssv}</span>
                      <span className="block text-[12px] leading-snug text-slate-400">Lớp: {selected.classCode} - {cls.name}</span>
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <span className="rounded-lg border border-slate-100 p-2"><b className="block text-[16px]">{selected.assignmentAvg === null ? "-" : selected.assignmentAvg.toFixed(1)}</b><span className="block text-[11px] leading-tight text-slate-400">Bài tập</span><span className="block text-[10.5px] font-medium leading-tight text-slate-400">{weights.assignment}%</span></span>
                    <span className="rounded-lg border border-slate-100 p-2"><b className="block text-[16px] text-green-600">{selected.quizAvg === null ? "-" : selected.quizAvg.toFixed(1)}</b><span className="block text-[11px] leading-tight text-slate-400">Kiểm tra</span><span className="block text-[10.5px] font-medium leading-tight text-slate-400">{weights.quiz}%</span></span>
                    <span className="rounded-lg bg-green-50 p-2"><b className="block text-[16px] text-green-700">{(() => { const t = total10(selected, weights); return t === null ? "-" : t.toFixed(1); })()}</b><span className="block text-[11px] leading-tight text-slate-500">Điểm tổng</span><span className="block text-[10.5px] font-medium leading-tight text-slate-500">Thang 10</span></span>
                  </div>
                  <div className="mt-3 flex gap-4 border-b border-slate-100 pb-1.5 text-[13px]">
                    <button onClick={() => setItemTab("assignment")} className={`relative pb-1.5 font-semibold ${itemTab === "assignment" ? "text-blue-600" : "text-slate-400"}`}>
                      Bài tập ({selected.items.filter((i) => i.kind === "assignment").length})
                      {itemTab === "assignment" && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-blue-600" />}
                    </button>
                    <button onClick={() => setItemTab("quiz")} className={`relative pb-1.5 ${itemTab === "quiz" ? "font-semibold text-blue-600" : "text-slate-400"}`}>
                      Kiểm tra ({selected.items.filter((i) => i.kind === "quiz").length})
                      {itemTab === "quiz" && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-blue-600" />}
                    </button>
                  </div>
                  <table className="mt-1 w-full text-left text-[12.5px]">
                    <thead><tr className="text-slate-400"><th className="whitespace-nowrap py-1.5 pr-2 font-medium">Tên bài tập</th><th className="whitespace-nowrap px-1 text-center font-medium">Điểm</th><th className="whitespace-nowrap px-1 text-center font-medium">Tối đa</th><th className="whitespace-nowrap px-1 text-center font-medium">Tỷ lệ</th><th /></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {selected.items.filter((i) => i.kind === itemTab).map((it) => (
                        <tr key={it.itemId}>
                          <td className="py-2 pr-2 font-medium leading-snug text-slate-700">{it.itemName}</td>
                          <td className={`whitespace-nowrap px-1 text-center font-bold ${scoreColor(it.score === null ? null : round1((it.score / it.maxScore) * 10))}`}>{it.score === null ? "-" : it.score.toFixed(1)}</td>
                          <td className="whitespace-nowrap px-1 text-center text-slate-500">{it.maxScore}</td>
                          <td className="whitespace-nowrap px-1 text-center text-slate-500">{it.score === null ? "-" : `${round1((it.score / it.maxScore) * 100)}%`}</td>
                          <td><button onClick={() => openEdit(selected)} aria-label="Sửa điểm" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => openEdit(selected)} className="mt-2 w-full rounded-lg border border-blue-200 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">Sửa điểm học sinh</button>
                </>
              ) : (
                <ul className="mt-3 space-y-2.5 text-[12.5px]">
                  {history.length === 0 && <li className="rounded-lg bg-slate-50 px-3 py-4 text-center text-slate-400">Chưa có thay đổi nào trong phiên này.</li>}
                  {history.map((h) => (
                    <li key={h.id} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                      {h.text}
                      <span className="block text-[11px] text-slate-400">{h.time}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Modal trọng số */}
      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} title="Cấu hình trọng số điểm" widthClass="max-w-[420px]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Bài tập (%)</label>
              <input value={wA} onChange={(e) => setWA(e.target.value)} inputMode="numeric" className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Kiểm tra (%)</label>
              <input value={wQ} onChange={(e) => setWQ(e.target.value)} inputMode="numeric" className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </div>
          </div>
          {wError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{wError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setWeightOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button onClick={saveWeights} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Lưu</button>
          </div>
        </div>
      </Modal>

      {/* Modal sửa điểm */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Sửa điểm — ${editing?.name ?? ""}`} widthClass="max-w-[420px]">
        {editing && (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">MSSV: {editing.mssv} • Để trống nếu chưa có điểm.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Bài tập TB (0-10)</label>
                <input value={eA} onChange={(e) => setEA(e.target.value)} inputMode="decimal" placeholder="VD: 8.5" className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Kiểm tra TB (0-10)</label>
                <input value={eQ} onChange={(e) => setEQ(e.target.value)} inputMode="decimal" placeholder="VD: 9.0" className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              </div>
            </div>
            {eError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{eError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={saveEdit} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Lưu điểm</button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toast} />
    </TeacherShell>
  );
}
