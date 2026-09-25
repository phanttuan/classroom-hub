"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  Info,
  Mail,
  Megaphone,
  MoreVertical,
  Search,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import Modal from "../../teacher/components/Modal";
import { TONE_BOX } from "../components/student-shared";
import { studentInbox } from "@/lib/mock/student";
import type { StudentInboxItem } from "@/lib/types/student";

type Pill = "all" | "important" | "class" | "assignment" | "schedule" | "system";

function tagOf(n: StudentInboxItem): { label: string; cls: string } {
  if (/tài liệu/i.test(n.title)) return { label: "Tài liệu", cls: "bg-orange-100/80 text-orange-600" };
  if (/kiểm tra 2/i.test(n.title) && n.category === "schedule") return { label: "Kiểm tra", cls: "bg-green-100/80 text-green-700" };
  switch (n.category) {
    case "class": return { label: "Lớp học", cls: "bg-purple-100/80 text-purple-600" };
    case "assignment": return { label: "Bài tập", cls: "bg-red-100/70 text-red-500" };
    case "schedule": return { label: "Lịch học", cls: "bg-blue-100/80 text-blue-600" };
    case "grade": return { label: "Điểm số", cls: "bg-green-100/80 text-green-700" };
    default: return { label: "Hệ thống", cls: "bg-blue-100/80 text-blue-600" };
  }
}

function RowIcon({ n }: { n: StudentInboxItem }) {
  const box = TONE_BOX[n.tone];
  const cls = "h-5 w-5";
  const icon =
    n.category === "schedule" ? <CalendarDays className={cls} />
    : n.category === "grade" ? <CheckCircle2 className={cls} />
    : n.category === "class" && /mới|thêm/i.test(n.title) ? <Users className={cls} />
    : n.category === "class" ? <Megaphone className={cls} />
    : n.category === "system" && /chúc mừng/i.test(n.title) ? <Trophy className={cls} />
    : n.category === "system" ? <Info className={cls} />
    : <FileText className={cls} />;
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${box}`}>{icon}</span>;
}

export default function StudentNotificationsPage() {
  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pill, setPill] = useState<Pill>("all");
  const [items, setItems] = useState<StudentInboxItem[]>(studentInbox);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentInboxItem | null>(null);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  const counts = useMemo(
    () => ({
      all: items.length,
      important: items.filter((i) => i.important).length,
      class: items.filter((i) => i.category === "class").length,
      assignment: items.filter((i) => i.category === "assignment").length,
      schedule: items.filter((i) => i.category === "schedule").length,
      system: items.filter((i) => i.category === "system").length,
      unread: items.filter((i) => i.unread).length,
      read: items.filter((i) => !i.unread).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...items];
    if (pill === "important") list = list.filter((i) => i.important);
    else if (pill !== "all") list = list.filter((i) => i.category === pill);
    if (q) list = list.filter((i) => `${i.title} ${i.desc}`.toLowerCase().includes(q));
    return list;
  }, [items, pill, query, topSearch]);

  const byClass = useMemo(() => {
    const groups: { code: string; name: string; count: number; time: string; unread: boolean }[] = [
      { code: "WEB301", name: "Lập trình Web nâng cao", count: 0, time: "2 giờ trước", unread: true },
      { code: "PY101", name: "Python cơ bản", count: 0, time: "1 ngày trước", unread: true },
      { code: "DB201", name: "Cơ sở dữ liệu", count: 0, time: "3 ngày trước", unread: true },
      { code: "UI201", name: "Thiết kế giao diện Web", count: 0, time: "5 ngày trước", unread: false },
      { code: "DSA201", name: "Cấu trúc dữ liệu và giải thuật", count: 0, time: "1 tuần trước", unread: true },
    ];
    const hit = (code: string, re: RegExp) => items.filter((i) => i.unread && re.test(`${i.title} ${i.desc}`)).length;
    groups[0].count = hit("WEB301", /WEB301|Web nâng cao|JavaScript|HTML|Figma|Responsive/i);
    groups[1].count = hit("PY101", /PY101|Python/i);
    groups[2].count = hit("DB201", /DB201|Cơ sở dữ liệu/i);
    groups[3].count = 0;
    groups[4].count = hit("DSA201", /DSA201|giải thuật/i);
    return groups;
  }, [items]);

  const markRead = (id: string) => setItems((p) => p.map((i) => (i.id === id ? { ...i, unread: false } : i)));

  const pills: { id: Pill; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: `Tất cả (${counts.all})`, icon: null },
    { id: "important", label: `Quan trọng (${counts.important})`, icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
    { id: "class", label: `Lớp học (${counts.class})`, icon: <GraduationCap className="h-4 w-4 text-slate-400" /> },
    { id: "assignment", label: `Bài tập (${counts.assignment})`, icon: <FileText className="h-4 w-4 text-slate-400" /> },
    { id: "schedule", label: `Lịch học (${counts.schedule})`, icon: <CalendarDays className="h-4 w-4 text-slate-400" /> },
    { id: "system", label: `Hệ thống (${counts.system})`, icon: <Settings className="h-4 w-4 text-slate-400" /> },
  ];

  return (
    <StudentShell activeId="notifs" searchPlaceholder="Tìm kiếm thông báo, lớp học, giảng viên, nội dung..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight">Thông báo</h1>
              <p className="mt-0.5 text-[14px] text-slate-500">Cập nhật các thông báo mới nhất từ giảng viên, lớp học và hệ thống</p>
            </div>
            <span className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm thông báo..."
                className="h-10 w-[240px] rounded-lg bg-white pl-9 pr-3 text-[13px] outline-none ring-1 ring-slate-200 placeholder:text-slate-400" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {pills.map((p) => (
              <button key={p.id} onClick={() => setPill(p.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${pill === p.id ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200" : "bg-white text-slate-500 ring-1 ring-slate-200/70 hover:bg-slate-50"}`}>
                {p.icon}{p.label}
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-3">
            {filtered.map((n) => {
              const tag = tagOf(n);
              return (
                <li key={n.id} onClick={() => { markRead(n.id); setDetail(n); }}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-3.5 transition hover:border-blue-200 hover:shadow-sm">
                  <RowIcon n={n} />
                  <span className="min-w-0 flex-1">
                    <b className="block text-[13.5px] leading-snug">{n.title}</b>
                    <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-relaxed text-slate-500">{n.desc}</span>
                    <span className={`mt-1.5 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${tag.cls}`}>{tag.label}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      {n.timeAgo}
                      <span className={`h-2 w-2 rounded-full ${n.unread ? (n.important ? "bg-red-500" : "bg-blue-600") : "bg-slate-300"}`} />
                    </span>
                    {n.important && <span className="text-[11px] font-medium text-red-500">Quan trọng</span>}
                    {n.category === "schedule" && !n.important && <span className="text-[11px] font-medium text-blue-600">Lịch học</span>}
                    {n.category === "grade" && <span className="text-[11px] font-medium text-green-600">Điểm số</span>}
                  </span>
                  <span onClick={(e) => e.stopPropagation()} className="relative shrink-0">
                    <button onClick={() => setMenuId(menuId === n.id ? null : n.id)} aria-label="Tùy chọn" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuId === n.id && (
                      <>
                        <button aria-label="Đóng" onClick={() => setMenuId(null)} className="fixed inset-0 z-10 cursor-default" />
                        <span className="absolute right-0 top-full z-20 w-48 overflow-hidden rounded-xl border bg-white py-1 text-left shadow-xl">
                          <button onClick={() => { setMenuId(null); markRead(n.id); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Đánh dấu đã đọc</button>
                          <button onClick={() => { setMenuId(null); setItems((p) => p.map((i) => (i.id === n.id ? { ...i, important: !i.important } : i))); showToast("Đã cập nhật quan trọng"); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">
                            {n.important ? "Bỏ quan trọng" : "Đánh dấu quan trọng"}
                          </button>
                          <button onClick={() => { setMenuId(null); setItems((p) => p.filter((i) => i.id !== n.id)); showToast("Đã xóa thông báo"); }} className="block w-full px-3.5 py-2 text-left text-[12.5px] text-red-600 hover:bg-red-50">Xóa</button>
                        </span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500">Không có thông báo nào.</li>}
          </ul>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border border-blue-100/70 bg-blue-50/50 p-4">
            <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold"><span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-[12px] text-white">🔔</span> Tổng quan thông báo</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                <Bell className="mx-auto h-5 w-5 text-blue-600" />
                <b className="mt-0.5 block text-[19px]">{counts.all}</b>
                <span className="text-[11.5px] text-blue-600">Tổng số</span>
              </div>
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                <FileText className="mx-auto h-5 w-5 text-red-500" />
                <b className="mt-0.5 block text-[19px]">{counts.important}</b>
                <span className="text-[11.5px] text-red-500">Quan trọng</span>
              </div>
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                <Mail className="mx-auto h-5 w-5 text-blue-600" />
                <b className="mt-0.5 block text-[19px]">{counts.unread}</b>
                <span className="text-[11.5px] text-slate-400">Chưa đọc</span>
              </div>
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                <b className="mt-0.5 block text-[19px]">{counts.read}</b>
                <span className="text-[11.5px] text-slate-400">Đã đọc</span>
              </div>
            </div>
            {counts.unread > 0 && (
              <button onClick={() => { setItems((p) => p.map((i) => ({ ...i, unread: false }))); showToast("Đã đọc tất cả thông báo"); }} className="mt-2.5 w-full rounded-lg bg-white py-2 text-[12.5px] font-semibold text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50">
                Đánh dấu đọc tất cả
              </button>
            )}
          </section>

          <section className="rounded-xl border border-red-100 bg-red-50/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold"><span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-[12px] text-white">!</span> Thông báo quan trọng</h2>
              <button onClick={() => setPill("important")} className="text-[12.5px] font-medium text-blue-600">Xem tất cả →</button>
            </div>
            <ul className="mt-3 space-y-3">
              {items.filter((i) => i.important).map((n) => (
                <li key={n.id}>
                  <button onClick={() => { markRead(n.id); setDetail(n); }} className="flex w-full gap-2.5 text-left">
                    <RowIcon n={n} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2"><b className="text-[12.5px] leading-snug">{n.title}</b><span className="flex shrink-0 items-center gap-1 text-[10.5px] text-slate-400">{n.timeAgo}<span className={`h-1.5 w-1.5 rounded-full ${n.unread ? "bg-red-500" : "bg-slate-300"}`} /></span></span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-slate-500">{n.desc.slice(0, 40)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">🎓 Thông báo theo lớp học</h2>
              <button onClick={() => setPill("class")} className="text-[12.5px] font-medium text-blue-600">Xem tất cả →</button>
            </div>
            <ul className="mt-3 space-y-3">
              {byClass.map((g) => (
                <li key={g.code}>
                  <button onClick={() => showToast(`Lọc lớp ${g.code} (demo) — dùng thanh tìm kiếm để lọc`)} className="flex w-full items-center gap-2.5 text-left">
                    <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg bg-blue-50 text-[11px] font-bold text-blue-600">{g.code}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[12.5px]">{g.name}</b>
                      <span className="block truncate text-[11px] text-slate-400">{g.count === 0 ? "Không có thông báo mới" : `Có ${g.count} thông báo mới`}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[10.5px] text-slate-400">{g.time}</span>
                      <span className={`ml-auto mt-0.5 block h-1.5 w-1.5 rounded-full ${g.unread && g.count > 0 ? "bg-red-500" : g.unread ? "bg-blue-600" : "bg-slate-300"}`} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ""}>
        {detail && (
          <div className="space-y-2.5 text-sm">
            <p className="text-[11.5px] text-slate-400">{detail.timeAgo}</p>
            <p className="leading-relaxed text-slate-600">{detail.desc}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setItems((p) => p.map((i) => (i.id === detail.id ? { ...i, important: !i.important } : i))); setDetail(null); showToast("Đã cập nhật quan trọng"); }} className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50">
                {detail.important ? "Bỏ quan trọng" : "Đánh dấu quan trọng"}
              </button>
              <button onClick={() => setDetail(null)} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700">Đóng</button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toast} />
    </StudentShell>
  );
}
