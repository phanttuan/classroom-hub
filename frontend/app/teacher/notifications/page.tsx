"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  Archive,
  Bell,
  CheckSquare,
  Eye,
  FileText,
  Flag,
  ListFilter,
  Mail,
  Pencil,
  Pin,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import Modal from "../components/Modal";
import { Pagination, RowMenu } from "../components/work-shared";
import {
  inboxClassOptions,
  inboxNotifications,
  inboxStatusOptions,
  inboxTypeOptions,
} from "@/lib/mock/teacher-inbox";
import type { InboxCategory, InboxNotification } from "@/lib/types/teacher";

type InboxTab = "all" | "unread" | "important" | InboxCategory;

const CAT_META: Record<InboxCategory, { label: string; pill: string; box: string; Icon: typeof FileText }> = {
  assignment: { label: "Bài tập", pill: "bg-pink-100/80 text-pink-600", box: "bg-red-50 text-red-500", Icon: FileText },
  quiz: { label: "Kiểm tra", pill: "bg-purple-100/80 text-purple-600", box: "bg-purple-50 text-purple-600", Icon: FileText },
  class: { label: "Lớp học", pill: "bg-blue-100/80 text-blue-600", box: "bg-orange-50 text-orange-500", Icon: Users },
  system: { label: "Hệ thống", pill: "bg-sky-100/80 text-sky-600", box: "bg-blue-50 text-blue-600", Icon: Settings },
};

function RowIcon({ n }: { n: InboxNotification }) {
  if (n.title.startsWith("Đã đến hạn")) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-50 text-green-600">
        <CheckSquare className="h-5 w-5" />
      </span>
    );
  }
  const meta = CAT_META[n.category];
  return (
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${meta.box}`}>
      <meta.Icon className="h-5 w-5" />
    </span>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-blue-600" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function TeacherNotificationsPage() {
  const [topSearch, setTopSearch] = useState("");
  const [tab, setTab] = useState<InboxTab>("all");
  const [classFilter, setClassFilter] = useState(inboxClassOptions[0]);
  const [typeFilter, setTypeFilter] = useState(inboxTypeOptions[0]);
  const [statusFilter, setStatusFilter] = useState(inboxStatusOptions[0]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<InboxNotification[]>(inboxNotifications);
  const [selectedId, setSelectedId] = useState("in-1");
  const [checked, setChecked] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [score, setScore] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [prefs, setPrefs] = useState({ email: true, push: true, assignment: true, quiz: true, classN: true, system: false });
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  };
  const resetPage = () => setPage(1);

  const live = useMemo(() => items.filter((i) => !i.archived), [items]);
  const counts = useMemo(
    () => ({
      all: items.length,
      unread: live.filter((i) => i.unread).length,
      important: live.filter((i) => i.important).length,
      archived: items.filter((i) => i.archived).length,
      assignment: live.filter((i) => i.category === "assignment").length,
      quiz: live.filter((i) => i.category === "quiz").length,
      class: live.filter((i) => i.category === "class").length,
      system: live.filter((i) => i.category === "system").length,
    }),
    [items, live],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...items];
    // tab
    if (statusFilter === "Đã lưu trữ") list = list.filter((i) => i.archived);
    else {
      list = list.filter((i) => !i.archived);
      if (tab === "unread") list = list.filter((i) => i.unread);
      else if (tab === "important") list = list.filter((i) => i.important);
      else if (tab !== "all") list = list.filter((i) => i.category === tab);
      if (statusFilter === "Chưa đọc") list = list.filter((i) => i.unread);
      if (statusFilter === "Quan trọng") list = list.filter((i) => i.important);
    }
    if (classFilter !== "Tất cả lớp học") list = list.filter((i) => i.classCode === classFilter);
    if (typeFilter !== "Tất cả loại thông báo") {
      const map: Record<string, InboxCategory> = { "Bài tập": "assignment", "Kiểm tra": "quiz", "Lớp học": "class", "Hệ thống": "system" };
      list = list.filter((i) => i.category === map[typeFilter]);
    }
    if (q) list = list.filter((i) => `${i.title} ${i.description} ${i.classCode}`.toLowerCase().includes(q));
    return list;
  }, [items, tab, classFilter, typeFilter, statusFilter, query, topSearch]);

  const pageSize = 7;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  const selected = items.find((i) => i.id === selectedId) ?? pageItems[0] ?? null;
  const selMeta = selected ? CAT_META[selected.category] : null;

  const patch = (id: string, p: Partial<InboxNotification>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const toggleCheck = (id: string) =>
    setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const bulkRead = () => {
    setItems((prev) => prev.map((i) => (checked.includes(i.id) ? { ...i, unread: false } : i)));
    showToast(`Đã đánh dấu ${checked.length} thông báo là đã đọc`);
    setChecked([]);
  };
  const bulkArchive = () => {
    setItems((prev) => prev.map((i) => (checked.includes(i.id) ? { ...i, archived: true } : i)));
    showToast(`Đã lưu trữ ${checked.length} thông báo`);
    setChecked([]);
  };
  const bulkDelete = () => {
    setItems((prev) => prev.filter((i) => !checked.includes(i.id)));
    showToast(`Đã xóa ${checked.length} thông báo`);
    setChecked([]);
  };

  const submitGrade = () => {
    const v = Number(score);
    if (!Number.isFinite(v) || v < 0 || v > 10) {
      setScoreError("Điểm phải trong khoảng 0 - 10.");
      return;
    }
    if (selected) patch(selected.id, { unread: false });
    setGradeOpen(false);
    setScore("");
    showToast(`Đã chấm ${v} điểm cho bài nộp`);
  };

  const tabs: { id: InboxTab; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "unread", label: `Chưa đọc (${counts.unread})` },
    { id: "important", label: `Quan trọng (${counts.important})` },
    { id: "assignment", label: `Bài tập (${counts.assignment})` },
    { id: "quiz", label: `Kiểm tra (${counts.quiz})` },
    { id: "class", label: `Lớp học (${counts.class})` },
    { id: "system", label: `Hệ thống (${counts.system})` },
  ];

  const stats = [
    { label: "Tất cả", value: counts.all, icon: Bell, cls: "bg-blue-50 text-blue-600", go: () => { setTab("all"); setStatusFilter(inboxStatusOptions[0]); resetPage(); } },
    { label: "Chưa đọc", value: counts.unread, icon: Mail, cls: "bg-green-50 text-green-600", go: () => { setTab("unread"); resetPage(); } },
    { label: "Quan trọng", value: counts.important, icon: Pin, cls: "bg-orange-50 text-orange-500", go: () => { setTab("important"); resetPage(); } },
    { label: "Đã lưu trữ", value: counts.archived, icon: Archive, cls: "bg-red-50 text-red-500", go: () => { setTab("all"); setStatusFilter("Đã lưu trữ"); resetPage(); } },
  ];

  return (
    <TeacherShell activeId="notifs" searchPlaceholder="Tìm kiếm học sinh, lớp học, bài tập, kiểm tra..." searchValue={topSearch} onSearchChange={(v) => { setTopSearch(v); resetPage(); }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Thông báo</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Xem và quản lý các thông báo liên quan đến lớp học của bạn</p>
        </div>
        <button onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-blue-600 hover:bg-blue-50">
          <Settings className="h-4 w-4" /> Cài đặt thông báo
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <button key={s.label} onClick={s.go} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-md hover:shadow-blue-50">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${s.cls}`}><s.icon className="h-6 w-6" /></span>
            <span><span className="block text-[13px] text-slate-500">{s.label}</span>
            <span className="block text-[22px] font-extrabold">{s.value}</span></span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* Danh sách */}
        <section className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-4">
          <div className="flex flex-wrap gap-1 border-b border-slate-100">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); resetPage(); }} className={`relative whitespace-nowrap px-2.5 pb-3 pt-1 text-[13px] font-medium ${tab === t.id && statusFilter !== "Đã lưu trữ" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                {t.label}
                {tab === t.id && statusFilter !== "Đã lưu trữ" && <span className="absolute inset-x-1 -bottom-px h-[2.5px] rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
            <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); resetPage(); }} className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none" aria-label="Lọc lớp học">
              {inboxClassOptions.map((o) => (<option key={o}>{o}</option>))}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }} className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none" aria-label="Lọc loại">
              {inboxTypeOptions.map((o) => (<option key={o}>{o}</option>))}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }} className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none" aria-label="Lọc trạng thái">
              {inboxStatusOptions.map((o) => (<option key={o}>{o}</option>))}
            </select>
            <span className="relative col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => { setQuery(e.target.value); resetPage(); }} placeholder="Tìm kiếm thông báo..."
                className="h-10 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-[12.5px] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
            </span>
            <button onClick={() => showToast("Tùy chọn lọc nâng cao (demo)")} aria-label="Lọc nâng cao" className="grid h-10 w-11 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
              <ListFilter className="h-4 w-4" />
            </button>
          </div>

          {checked.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[13px] text-blue-700">
              Đã chọn {checked.length}
              <button onClick={bulkRead} className="whitespace-nowrap rounded-md bg-white px-2.5 py-1 font-semibold shadow-sm">Đánh dấu đã đọc</button>
              <button onClick={bulkArchive} className="whitespace-nowrap rounded-md bg-white px-2.5 py-1 font-semibold shadow-sm">Lưu trữ</button>
              <button onClick={bulkDelete} className="whitespace-nowrap rounded-md bg-white px-2.5 py-1 font-semibold text-red-600 shadow-sm">Xóa</button>
              <button onClick={() => setChecked([])} className="font-semibold">Bỏ chọn</button>
            </div>
          )}

          <ul className="mt-3 space-y-2.5">
            {pageItems.map((n) => {
              const meta = CAT_META[n.category];
              const isSel = selectedId === n.id;
              return (
                <li key={n.id} onClick={() => { setSelectedId(n.id); patch(n.id, { unread: false }); }}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${isSel ? "border-blue-200 bg-blue-50/60" : "border-slate-100 bg-white hover:border-blue-100 hover:bg-slate-50/60"}`}>
                  <input type="checkbox" checked={checked.includes(n.id)} onChange={() => toggleCheck(n.id)} onClick={(e) => e.stopPropagation()} aria-label="Chọn thông báo" className="mt-3 h-4 w-4 shrink-0 accent-blue-600" />
                  <RowIcon n={n} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold leading-snug">{n.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-slate-500">{n.description}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
                      Lớp: {n.classCode} - {n.className}
                      <span className={`whitespace-nowrap rounded-md px-2 py-0.5 font-medium ${meta.pill}`}>{meta.label}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
                      {n.unread && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                      {n.timeAgo}
                    </span>
                    {n.important && <span className="flex items-center gap-1 text-[11.5px] font-medium text-red-500"><Flag className="h-3 w-3 fill-red-500" /> Quan trọng</span>}
                  </span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: n.unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc", onClick: () => patch(n.id, { unread: !n.unread }) },
                      { label: n.important ? "Bỏ quan trọng" : "Đánh dấu quan trọng", onClick: () => { patch(n.id, { important: !n.important }); showToast(n.important ? "Đã bỏ quan trọng" : "Đã đánh dấu quan trọng"); } },
                      { label: n.archived ? "Bỏ lưu trữ" : "Lưu trữ", onClick: () => { patch(n.id, { archived: !n.archived }); showToast("Đã cập nhật lưu trữ"); } },
                      { label: "Xóa", danger: true, onClick: () => { setItems((p) => p.filter((x) => x.id !== n.id)); showToast("Đã xóa thông báo"); } },
                    ]} />
                  </span>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 && <p className="mt-3 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Không có thông báo nào.</p>}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-500">
            <span>Hiển thị {from} - {to} trong {filtered.length} thông báo</span>
            <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
          </div>
        </section>

        {/* Chi tiết */}
        {selected && selMeta && (
          <aside className="h-fit rounded-xl border border-slate-200/70 bg-white p-4 xl:sticky xl:top-[84px]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">Chi tiết thông báo</h2>
              <button onClick={() => showToast("Đóng panel (demo)")} aria-label="Đóng" className="ml-auto grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex items-start gap-2.5">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selMeta.box}`}><selMeta.Icon className="h-5 w-5" /></span>
              <span>
                <span className="block text-[13.5px] font-bold leading-snug">{selected.title}</span>
                <span className="mt-0.5 block text-[11.5px] text-slate-400">{selected.timeAgo}</span>
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
              {selected.actorName ? <><b className="text-slate-800">{selected.actorName}</b>{selected.actorMssv ? ` (MSSV: ${selected.actorMssv})` : ""} {selected.description.replace(/^.*?đã nộp bài tập\./, "đã nộp bài tập")} <b className="text-slate-800">“{selected.title.split(": ").slice(1).join(": ") || selected.title}”</b>.</> : selected.description}
            </p>
            {!selected.actorName && <p className="mt-1 text-[13px] text-slate-500">{selected.category === "assignment" ? "Phần chấm điểm đang chờ bạn đánh giá." : ""}</p>}

            <ul className="mt-3 space-y-2.5 border-t border-slate-100 pt-3 text-[13px]">
              {selected.actorName && (
                <li className="flex items-center gap-3">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-slate-300" />
                  <span className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                    <Image src={`https://i.pravatar.cc/80?img=${selected.actorAvatarImg ?? 47}`} alt={selected.actorName} width={40} height={40} className="h-full w-full object-cover" unoptimized />
                  </span>
                  <span><span className="block text-[11.5px] text-slate-400">Học sinh</span><b className="block">{selected.actorName}</b><span className="block text-[11.5px] text-slate-400">MSSV: {selected.actorMssv}</span></span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-slate-300" />
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Users className="h-5 w-5" /></span>
                <span><span className="block text-[11.5px] text-slate-400">Lớp học</span><span className="block font-medium">{selected.classCode} - {selected.className}</span></span>
              </li>
              {(selected.category === "assignment" || selected.category === "quiz") && (
                <li className="flex items-center gap-3">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-slate-300" />
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-500"><FileText className="h-5 w-5" /></span>
                  <span><span className="block text-[11.5px] text-slate-400">{selMeta.label}</span><span className="block font-medium">{selected.title.split(": ").slice(1).join(": ") || selected.title}</span></span>
                </li>
              )}
              {selected.submittedAt && (
                <li className="flex items-center gap-3">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-slate-300" />
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600"><Mail className="h-5 w-5" /></span>
                  <span><span className="block text-[11.5px] text-slate-400">Thời gian nộp</span><span className="block font-medium">{selected.submittedAt}</span></span>
                </li>
              )}
              {selected.statusLabel && (
                <li className="flex items-center gap-3">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-slate-300" />
                  <span className="h-3.5 w-3.5 rounded-full bg-blue-600" />
                  <span><span className="block text-[11.5px] text-slate-400">Trạng thái</span><span className="block font-medium text-blue-600">{selected.statusLabel}</span></span>
                </li>
              )}
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setSubmissionOpen(true)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700">
                <Eye className="h-4 w-4" /> Xem bài nộp
              </button>
              <button onClick={() => { setScoreError(""); setGradeOpen(true); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
                <Pencil className="h-4 w-4" /> Chấm điểm
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-[13px]">
              <button onClick={() => { patch(selected.id, { important: !selected.important }); showToast(selected.important ? "Đã bỏ quan trọng" : "Đã đánh dấu quan trọng"); }} className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-700">
                <Pin className="h-4 w-4" /> {selected.important ? "Bỏ quan trọng" : "Đánh dấu quan trọng"}
              </button>
              <button onClick={() => { patch(selected.id, { archived: true }); showToast("Đã lưu trữ thông báo"); }} className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-700">
                <Archive className="h-4 w-4" /> Lưu trữ
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Modal cài đặt */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Cài đặt thông báo" widthClass="max-w-[440px]">
        <div className="space-y-3 text-[13.5px]">
          {([
            ["email", "Email", "Nhận thông báo qua email"],
            ["push", "Push", "Nhận thông báo đẩy trên trình duyệt"],
            ["assignment", "Bài tập", "Nộp bài, đến hạn, chấm điểm"],
            ["quiz", "Kiểm tra", "Hoàn thành, sắp đến hạn"],
            ["classN", "Lớp học", "Thành viên mới, lịch học"],
            ["system", "Hệ thống", "Bảo trì, cập nhật"],
          ] as const).map(([key, label, desc]) => (
            <div key={key} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
              <span className="flex-1"><b className="block">{label}</b><span className="block text-[12px] text-slate-400">{desc}</span></span>
              <Toggle on={prefs[key]} onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))} label={label} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setSettingsOpen(false)} className="rounded-lg px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button onClick={() => { setSettingsOpen(false); showToast("Đã lưu cài đặt thông báo"); }} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">Lưu</button>
          </div>
        </div>
      </Modal>

      {/* Modal xem bài nộp */}
      <Modal open={submissionOpen} onClose={() => setSubmissionOpen(false)} title="Bài nộp của học sinh">
        {selected && (
          <div className="space-y-2.5 text-sm">
            <p className="font-bold">{selected.title.split(": ").slice(1).join(": ") || selected.title}</p>
            <p className="text-slate-500">Người nộp: {selected.actorName ?? "—"}{selected.actorMssv ? ` (${selected.actorMssv})` : ""} • {selected.submittedAt ?? selected.timeAgo}</p>
            <div className="rounded-xl bg-slate-50 p-4 text-center text-slate-400">
              <FileText className="mx-auto h-8 w-8" />
              <p className="mt-1 text-[12px]">Preview file nộp (demo): main.js — 24 KB</p>
            </div>
            <button onClick={() => { setSubmissionOpen(false); setScoreError(""); setGradeOpen(true); }} className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700">Chấm điểm ngay</button>
          </div>
        )}
      </Modal>

      {/* Modal chấm điểm */}
      <Modal open={gradeOpen} onClose={() => setGradeOpen(false)} title="Chấm điểm bài nộp" widthClass="max-w-[420px]">
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Điểm (0 - 10) *</label>
            <input value={score} onChange={(e) => setScore(e.target.value)} inputMode="decimal" placeholder="VD: 8.5"
              className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </div>
          {scoreError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{scoreError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setGradeOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button onClick={submitGrade} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Lưu điểm</button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </TeacherShell>
  );
}
