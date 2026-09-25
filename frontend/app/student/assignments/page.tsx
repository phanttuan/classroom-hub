"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MoreVertical,
  Search,
  Star,
  Upload,
  Users,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import Modal from "../../teacher/components/Modal";
import { StatCard, TONE_BOX } from "../components/student-shared";
import { assignmentComments, studentAssignments, studentProfile } from "@/lib/mock/student";
import type { AssignmentComment, StudentAssignment } from "@/lib/types/student";

type Tab = "all" | "pending" | "submitted" | "overdue";
const TODAY = new Date(2026, 8, 24);

function daysLeft(due: string): number {
  const [d, m, y] = due.split(" ")[0].split("/").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - TODAY.getTime()) / 86400000);
}

function StatusPill({ a }: { a: StudentAssignment }) {
  if (a.status === "submitted")
    return <span className="shrink-0 whitespace-nowrap rounded-md bg-green-100/80 px-2.5 py-1 text-[11.5px] font-medium text-green-700">Đã nộp</span>;
  if (a.status === "overdue" || daysLeft(a.due) < 0)
    return <span className="shrink-0 whitespace-nowrap rounded-md bg-red-50 px-2.5 py-1 text-[11.5px] font-medium text-red-500">Quá hạn</span>;
  const d = daysLeft(a.due);
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[11.5px] font-medium ${d <= 3 ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"}`}>
      Còn {d} ngày
    </span>
  );
}

export default function StudentAssignmentsPage() {
  const [topSearch, setTopSearch] = useState("");
  const [classFilter, setClassFilter] = useState("Tất cả lớp học");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Hạn nộp gần nhất");
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<StudentAssignment[]>(studentAssignments);
  const [selectedId, setSelectedId] = useState("sa2");
  const [panelTab, setPanelTab] = useState("info");
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [comments, setComments] = useState<AssignmentComment[]>(assignmentComments);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  const counts = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      submitted: items.filter((i) => i.status === "submitted").length,
      overdue: items.filter((i) => i.status === "overdue").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...items];
    if (tab !== "all") list = list.filter((i) => i.status === tab);
    if (classFilter !== "Tất cả lớp học") list = list.filter((i) => i.classCode === classFilter);
    if (statusFilter !== "Tất cả trạng thái") {
      const map: Record<string, Tab> = { "Chưa nộp": "pending", "Đã nộp": "submitted", "Quá hạn": "overdue" };
      list = list.filter((i) => i.status === map[statusFilter]);
    }
    if (q) list = list.filter((i) => `${i.title} ${i.classCode} ${i.courseName}`.toLowerCase().includes(q));
    const key = (d: string) => { const [dd, mm, yy] = d.split(" ")[0].split("/").map(Number); return yy * 10000 + mm * 100 + dd; };
    if (sort === "Hạn nộp gần nhất") list.sort((a, b) => key(a.due) - key(b.due));
    if (sort === "Tên A-Z") list.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    return list;
  }, [items, tab, classFilter, statusFilter, query, topSearch, sort]);

  const selected = items.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  const doSubmit = () => {
    if (!file) { setSubmitError("Vui lòng chọn file bài làm."); return; }
    if (file.size > 10 * 1024 * 1024) { setSubmitError("File tối đa 10MB."); return; }
    setSubmitError("");
    const now = new Date();
    const stamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const size = file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    setItems((p) => p.map((i) => (i.id === selectedId ? { ...i, status: "submitted" as const, submittedAt: stamp, fileName: file.name, fileSize: size } : i)));
    setSubmitOpen(false);
    setFile(null);
    setNote("");
    showToast("Nộp bài thành công 🎉");
  };

  const addComment = () => {
    if (!draft.trim()) return;
    setComments((p) => [...p, { id: `c${Date.now()}`, author: studentProfile.fullName, time: "Vừa xong", text: draft.trim() }]);
    setDraft("");
  };

  const actionBtn = (a: StudentAssignment) => {
    if (a.status === "pending")
      return <button onClick={() => { setSelectedId(a.id); setSubmitOpen(true); setSubmitError(""); }} className="rounded-lg bg-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-blue-700">Nộp bài</button>;
    if (a.status === "submitted")
      return <button onClick={() => { setSelectedId(a.id); setPanelTab("info"); }} className="rounded-lg border border-blue-200 px-4 py-2 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">Xem bài nộp</button>;
    return <button onClick={() => setSelectedId(a.id)} className="rounded-lg border border-blue-200 px-4 py-2 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">Xem chi tiết</button>;
  };

  return (
    <StudentShell activeId="assignments" searchPlaceholder="Tìm kiếm bài học, lớp học, tài liệu, bài tập..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Bài tập</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Xem và nộp các bài tập được giao từ giảng viên</p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block text-[12.5px] text-slate-500">Lớp học
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-white px-2.5 text-[13px] outline-none ring-1 ring-slate-200">
                {["Tất cả lớp học", "WEB301", "PY101", "DB201", "SE102"].map((o) => (<option key={o}>{o}</option>))}
              </select>
            </label>
            <label className="block text-[12.5px] text-slate-500">Trạng thái
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-white px-2.5 text-[13px] outline-none ring-1 ring-slate-200">
                {["Tất cả trạng thái", "Chưa nộp", "Đã nộp", "Quá hạn"].map((o) => (<option key={o}>{o}</option>))}
              </select>
            </label>
            <span className="relative col-span-2 block self-end">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm bài tập..."
                className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-[13px] outline-none ring-1 ring-slate-200 placeholder:text-slate-400" />
            </span>
          </div>
          <div className="mt-2 flex justify-end">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg bg-white px-3 text-[13px] outline-none ring-1 ring-slate-200" aria-label="Sắp xếp">
              {["Hạn nộp gần nhất", "Tên A-Z"].map((o) => (<option key={o}>Sắp xếp: {o}</option>))}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<FileText className="h-6 w-6" />} iconCls="bg-red-50 text-red-500" value={String(counts.pending)} label="Bài tập cần nộp" />
            <StatCard icon={<CheckCircle2 className="h-6 w-6" />} iconCls="bg-green-50 text-green-600" value={String(counts.submitted)} label="Đã nộp" />
            <StatCard icon={<Clock className="h-6 w-6" />} iconCls="bg-orange-50 text-orange-500" value={String(counts.overdue)} label="Quá hạn" />
            <StatCard icon={<FileText className="h-6 w-6" />} iconCls="bg-purple-50 text-purple-600" value={String(counts.total)} label="Tổng số bài tập" />
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-200">
            {([["all", `Tất cả (${counts.total})`], ["pending", `Chưa nộp (${counts.pending})`], ["submitted", `Đã nộp (${counts.submitted})`], ["overdue", `Quá hạn (${counts.overdue})`]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap px-3.5 pb-2.5 pt-1 text-[13.5px] font-medium ${tab === id ? "text-blue-600" : "text-slate-500"}`}>
                {label}
                {tab === id && <span className="mt-1 block h-[2.5px] rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>

          <ul className="mt-3 space-y-3">
            {filtered.map((a) => (
              <li key={a.id} onClick={() => setSelectedId(a.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${selectedId === a.id ? "border-blue-200 bg-blue-50/60" : "border-slate-200/70 bg-white hover:border-blue-100"}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONE_BOX[a.tone]}`}><FileText className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px]">{a.title}</b>
                  <span className="block truncate text-[11.5px] text-slate-400">{a.classCode} - {a.courseName}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-slate-400">
                    <span>📄 {a.filesLabel}</span><span>🕐 Hạn nộp: {a.due}</span><span>✦ {a.points} điểm</span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusPill a={a} />
                  {actionBtn(a)}
                </span>
                <span className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setMenuKey(menuKey === a.id ? null : a.id)} aria-label="Tùy chọn" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuKey === a.id && (
                    <>
                      <button aria-label="Đóng" onClick={() => setMenuKey(null)} className="fixed inset-0 z-10 cursor-default" />
                      <span className="absolute right-0 top-full z-20 w-44 overflow-hidden rounded-xl border bg-white py-1 text-left shadow-xl">
                        <button onClick={() => { setMenuKey(null); setSelectedId(a.id); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Xem chi tiết</button>
                        <button onClick={() => { setMenuKey(null); showToast(`Đã tải đề "${a.title}" (demo)`); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Tải đề bài</button>
                      </span>
                    </>
                  )}
                </span>
              </li>
            ))}
            {filtered.length === 0 && <li className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500">Không có bài tập nào.</li>}
          </ul>
        </div>

        {/* Panel chi tiết */}
        {selected && (
          <aside className="h-fit min-w-0 rounded-xl border border-slate-200/70 bg-white p-4 xl:sticky xl:top-[84px]">
            <div className="flex items-start gap-2.5">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONE_BOX[selected.tone]}`}><FileText className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-extrabold leading-snug">{selected.title}</h2>
                <p className="text-[12px] text-slate-400">{selected.classCode} - {selected.courseName}</p>
              </div>
              <StatusPill a={selected} />
            </div>

            <div className="mt-3 flex gap-1 border-b border-slate-100 text-[13px]">
              {[["info", "Thông tin"], ["guide", "Hướng dẫn"], ["docs", "Tài liệu"], ["chat", `Thảo luận (${comments.length})`]].map(([id, label]) => (
                <button key={id} onClick={() => setPanelTab(id)} className={`whitespace-nowrap px-2.5 pb-2 font-medium ${panelTab === id ? "text-blue-600" : "text-slate-400"}`}>
                  {label}
                  {panelTab === id && <span className="mt-1 block h-[2px] rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>

            {panelTab === "info" && (
              <div className="mt-3">
                <div className="rounded-xl bg-slate-50 p-3.5 text-[12.5px] leading-relaxed text-slate-600">
                  <b className="mb-1 block text-slate-800">Mô tả bài tập</b>
                  {selected.description.map((p, i) => (<p key={i} className={i === 0 ? "" : "mt-0.5"}>{p}</p>))}
                </div>
                <ul className="mt-3 space-y-2.5 text-[13px]">
                  <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-slate-400" /> Hạn nộp <span className="ml-auto font-medium">{selected.due} <span className="text-red-500">(Còn {Math.max(0, daysLeft(selected.due))} ngày)</span></span></li>
                  <li className="flex items-center gap-2.5"><Star className="h-4 w-4 text-slate-400" /> Điểm tối đa <span className="ml-auto font-medium">{selected.points} điểm</span></li>
                  <li className="flex items-center gap-2.5"><FileText className="h-4 w-4 text-slate-400" /> Yêu cầu nộp bài <span className="ml-auto font-medium">File .zip (tối đa 10MB)</span></li>
                  <li className="flex items-center gap-2.5"><Users className="h-4 w-4 text-slate-400" /> Hình thức <span className="ml-auto font-medium">Cá nhân</span></li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-slate-400" /> Tiêu chí chấm điểm <button onClick={() => showToast("Rubric: Chức năng 60%, Code 25%, Báo cáo 15%")} className="ml-auto font-medium text-blue-600">Xem chi tiết</button></li>
                  <li className="flex items-center gap-2.5"><Users className="h-4 w-4 text-slate-400" /> Giảng viên <span className="ml-auto flex items-center gap-1.5 font-medium"><span className="grid h-6 w-6 place-items-center rounded-full bg-slate-300 text-[10px] font-bold text-white">A</span> Nguyễn Văn A</span></li>
                </ul>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => showToast(`Đã tải tài liệu "${selected.title}" (demo)`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 py-2.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
                    <Download className="h-4 w-4" /> Tải tài liệu
                  </button>
                  {selected.status === "submitted" ? (
                    <button onClick={() => showToast("Bài đã nộp — xem bên dưới")} className="rounded-lg bg-slate-200 py-2.5 text-[13px] font-semibold text-slate-500">Đã nộp ✓</button>
                  ) : (
                    <button onClick={() => { setSubmitOpen(true); setSubmitError(""); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700">
                      <Upload className="h-4 w-4" /> Nộp bài
                    </button>
                  )}
                </div>
              </div>
            )}

            {panelTab === "guide" && (
              <ol className="mt-3 list-decimal space-y-2 rounded-xl bg-slate-50 p-3.5 pl-8 text-[12.5px] leading-relaxed text-slate-600">
                {selected.guide.map((g, i) => (<li key={i}>{g}</li>))}
              </ol>
            )}

            {panelTab === "docs" && (
              <ul className="mt-3 space-y-2">
                {[`De-bai-${selected.id}.pdf • 1.2 MB`, `Rubric-${selected.id}.pdf • 300 KB`].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px]">
                    <FileText className="h-4 w-4 text-red-500" /><span className="flex-1 truncate font-medium">{f}</span>
                    <button onClick={() => showToast(`Đang tải "${f}" (demo)`)} aria-label="Tải file" className="grid h-7 w-7 place-items-center rounded-md text-blue-600 hover:bg-blue-100"><Download className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}

            {panelTab === "chat" && (
              <div className="mt-3">
                <ul className="max-h-64 space-y-2.5 overflow-y-auto">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px]">
                      <p className="flex justify-between gap-2"><b>{c.author}</b><span className="text-slate-400">{c.time}</span></p>
                      <p className="mt-0.5 text-slate-600">{c.text}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Viết bình luận..."
                    className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-[12.5px] outline-none focus:border-blue-300" />
                  <button onClick={addComment} className="shrink-0 rounded-lg bg-blue-600 px-4 text-[12.5px] font-semibold text-white hover:bg-blue-700">Gửi</button>
                </div>
              </div>
            )}

            {selected.status === "submitted" && (
              <div className="mt-4 rounded-xl border border-slate-200/70 p-3.5">
                <p className="flex items-center justify-between text-[13.5px] font-bold">Bài nộp của bạn
                  <span className="rounded-md bg-green-100/80 px-2 py-0.5 text-[11px] font-medium text-green-700">Đã nộp</span>
                </p>
                <p className="mt-1 text-[12px] text-slate-400">Nộp lúc: {selected.submittedAt}</p>
                <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <span className="min-w-0 flex-1"><b className="block truncate text-[12.5px]">{selected.fileName}</b><span className="text-[11px] text-slate-400">{selected.fileSize}</span></span>
                  <button onClick={() => { setSubmitOpen(true); setSubmitError(""); }} aria-label="Nộp lại" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-200">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title={`Nộp bài — ${selected?.title ?? ""}`}>
        <div className="space-y-3">
          <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 py-6 text-blue-600 hover:bg-blue-50">
            <Upload className="h-6 w-6" />
            <span className="text-sm font-semibold">{file ? file.name : "Chọn file bài làm (.zip, tối đa 10MB)"}</span>
            {file && <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>}
          </button>
          <input ref={fileRef} type="file" accept=".zip,.pdf,.docx,.py,.js,.ipynb" className="hidden" aria-label="Chọn file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ghi chú cho giảng viên (không bắt buộc)..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400" />
          {submitError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{submitError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setSubmitOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button onClick={doSubmit} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Xác nhận nộp</button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </StudentShell>
  );
}
