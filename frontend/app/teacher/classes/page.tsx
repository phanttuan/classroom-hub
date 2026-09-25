"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Archive,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import {
  ClassDetailModal,
  ConfirmDeleteModal,
  CreateClassModal,
} from "../components/TeacherModals";
import { classPageClasses, demoAvatars, type ClassTab } from "@/lib/mock/teacher-classes";
import { dashboardStats } from "@/lib/mock/teacher-dashboard";
import type { TeacherClass } from "@/lib/types/teacher";

const TABS: { id: ClassTab; label: (counts: Record<ClassTab, number>) => string }[] = [
  { id: "all", label: (c) => `Tất cả (${c.all})` },
  { id: "active", label: (c) => `Đang hoạt động (${c.active})` },
  { id: "closed", label: (c) => `Đã đóng (${c.closed})` },
  { id: "archived", label: (c) => `Đã lưu trữ (${c.archived})` },
];

function StatusBadge({ status }: { status: TeacherClass["status"] }) {
  if (status === "active")
    return (
      <span className="whitespace-nowrap rounded-full bg-green-100/90 px-3 py-1 text-[12px] font-medium text-green-700">
        Đang hoạt động
      </span>
    );
  if (status === "closed")
    return (
      <span className="whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[12px] font-medium text-slate-600">
        Đã đóng
      </span>
    );
  return (
    <span className="whitespace-nowrap rounded-full bg-slate-200/90 px-3 py-1 text-[12px] font-medium text-slate-600">
      Đã lưu trữ
    </span>
  );
}

export default function TeacherClassesPage() {
  const [topSearch, setTopSearch] = useState("");
  const [tab, setTab] = useState<ClassTab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Mới cập nhật");
  const [classes, setClasses] = useState<TeacherClass[]>(classPageClasses);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherClass | null>(null);
  const [viewing, setViewing] = useState<TeacherClass | null>(null);
  const [deleting, setDeleting] = useState<TeacherClass | null>(null);
  const [copied, setCopied] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2500);
  };

  const counts = useMemo(() => {
    const c: Record<ClassTab, number> = {
      all: classes.length,
      active: classes.filter((x) => x.status === "active").length,
      closed: classes.filter((x) => x.status === "closed").length,
      archived: classes.filter((x) => x.status === "archived").length,
    };
    return c;
  }, [classes]);

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = classes.filter((c) => (tab === "all" ? true : c.status === tab));
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    if (sort === "Tên A-Z") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (sort === "Đông sinh viên nhất")
      list = [...list].sort((a, b) => b.studentCount - a.studentCount);
    return list;
  }, [classes, tab, query, topSearch, sort]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard có thể bị chặn — vẫn toast */
    }
    setCopied(code);
    showToast(`Đã sao chép mã lớp ${code}`);
    window.setTimeout(() => setCopied(""), 1500);
  };

  const handleCreate = (v: { name: string; code: string; status: TeacherClass["status"] }) => {
    if (editing) {
      setClasses((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...v } : c)));
      showToast(`Đã lưu lớp ${v.code}`);
      setEditing(null);
    } else {
      setClasses((prev) => [
        {
          id: `cls-${Date.now()}`,
          name: v.name,
          code: v.code,
          status: v.status,
          studentCount: 0,
          courseCount: 0,
          updatedAt: "15/09/2026",
          coverGradient: "from-blue-100 via-sky-100 to-slate-200",
          coverEmoji: "📚",
          description: "Lớp học mới tạo — bổ sung mô tả sau.",
          assignmentCount: 0,
          quizCount: 0,
          dateRange: "15/09/2026 - 15/12/2026",
        },
        ...prev,
      ]);
      showToast(`Đã tạo lớp ${v.code}`);
    }
    setCreateOpen(false);
  };

  const archiveClass = (c: TeacherClass) => {
    setClasses((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "archived" as const } : x)));
    setOpenMenuId(null);
    showToast(`Đã lưu trữ lớp ${c.code}`);
  };

  return (
    <TeacherShell
      activeId="classes"
      searchPlaceholder="Tìm kiếm lớp học, mã lớp, sinh viên..."
      searchValue={topSearch}
      onSearchChange={setTopSearch}
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Lớp học</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Quản lý các lớp học bạn đang giảng dạy</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Tạo lớp học
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
            <span
              className={`grid h-12 w-12 place-items-center rounded-xl ${
                i === 0 ? "bg-blue-50 text-blue-600" : i === 1 ? "bg-green-50 text-green-600" : i === 2 ? "bg-purple-50 text-purple-600" : "bg-orange-50 text-orange-500"
              }`}
            >
              {i === 0 || i === 1 ? <Users className="h-6 w-6" /> : i === 2 ? <FileText className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
            </span>
            <span>
              <span className="block text-[13px] text-slate-500">{s.label}</span>
              <span className="block text-[22px] font-extrabold leading-tight">{s.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Filter + grid */}
      <div className="rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 flex-wrap gap-1 border-b border-slate-100 sm:gap-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-1 pb-3 pt-1 text-[14px] font-medium transition ${
                  tab === t.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label(counts)}
                {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-[240px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm lớp học..."
              className="h-10 w-full rounded-lg bg-slate-100 pl-10 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-600">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent outline-none">
              <option>Mới cập nhật</option>
              <option>Tên A-Z</option>
              <option>Đông sinh viên nhất</option>
            </select>
          </label>
        </div>

        {/* Cards */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-xl border border-slate-200/70 transition hover:shadow-lg hover:shadow-slate-200">
              <div className={`relative grid h-[168px] place-items-center bg-gradient-to-br text-6xl ${c.coverGradient}`}>
                <span aria-hidden>{c.coverEmoji}</span>
                <span className="absolute left-3 top-3">
                  <StatusBadge status={c.status} />
                </span>
                <span className="absolute right-3 top-3">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                    aria-label={`Tùy chọn ${c.name}`}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-slate-600 shadow-sm transition hover:bg-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === c.id && (
                    <span className="absolute right-0 top-[calc(100%+6px)] z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">
                      <button onClick={() => { setOpenMenuId(null); setViewing(c); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50">
                        <Eye className="h-4 w-4" /> Xem chi tiết
                      </button>
                      <button onClick={() => { setOpenMenuId(null); setEditing(c); setCreateOpen(true); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50">
                        <Pencil className="h-4 w-4" /> Chỉnh sửa
                      </button>
                      <button onClick={() => archiveClass(c)} className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50">
                        <Archive className="h-4 w-4" /> Lưu trữ
                      </button>
                      <button onClick={() => { setOpenMenuId(null); setDeleting(c); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" /> Xóa lớp
                      </button>
                    </span>
                  )}
                </span>
              </div>

              <div className="p-4">
                <h3 className="text-[16px] font-bold">{c.name}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500">
                  Mã lớp: {c.code}
                  <button onClick={() => copyCode(c.code)} aria-label={`Sao chép mã ${c.code}`} className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                    {copied === c.code ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </p>
                <p className="mt-1.5 line-clamp-2 min-h-[40px] text-[13px] leading-relaxed text-slate-500">
                  {c.description}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <span className="rounded-lg bg-blue-50/70 px-2 py-2 text-center">
                    <span className="flex items-center justify-center gap-1 text-[13px] font-bold"><Users className="h-3.5 w-3.5 text-blue-500" /> {c.studentCount}</span>
                    <span className="text-[11.5px] text-slate-500">Sinh viên</span>
                  </span>
                  <span className="rounded-lg bg-purple-50/70 px-2 py-2 text-center">
                    <span className="flex items-center justify-center gap-1 text-[13px] font-bold"><FileText className="h-3.5 w-3.5 text-purple-500" /> {c.assignmentCount ?? c.courseCount}</span>
                    <span className="text-[11.5px] text-slate-500">Bài tập</span>
                  </span>
                  <span className="rounded-lg bg-orange-50/70 px-2 py-2 text-center">
                    <span className="flex items-center justify-center gap-1 text-[13px] font-bold"><FileText className="h-3.5 w-3.5 text-orange-500" /> {c.quizCount ?? 0}</span>
                    <span className="text-[11.5px] text-slate-500">Kiểm tra</span>
                  </span>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-[13px] text-slate-500">
                  <CalendarDays className="h-4 w-4 text-slate-400" /> {c.dateRange ?? c.updatedAt}
                </p>

                <div className="mt-2 flex items-center">
                  {demoAvatars.map((src) => (
                    <span key={src} className="-ml-2 h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-slate-200 first:ml-0">
                      <Image src={src} alt="Sinh viên" width={28} height={28} className="h-full w-full object-cover" unoptimized />
                    </span>
                  ))}
                  <span className="-ml-2 grid h-7 place-items-center rounded-full border-2 border-white bg-slate-100 px-1.5 text-[11px] font-medium text-slate-500">
                    +{Math.max(c.studentCount - 4, 0)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {c.status === "closed" ? (
                    <>
                      <button onClick={() => setViewing(c)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
                        <BarChart3 className="h-4 w-4" /> Xem chi tiết
                      </button>
                      <button disabled className="rounded-lg bg-slate-100 px-3 py-2 text-[13px] font-medium text-slate-400">
                        Lớp đã đóng
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => showToast(`Mở quản lý lớp ${c.code} (demo)`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
                        <Settings className="h-4 w-4" /> Quản lý lớp học
                      </button>
                      <button onClick={() => setViewing(c)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">
                        <BarChart3 className="h-4 w-4" /> Xem chi tiết
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Không có lớp học nào trong mục này.
          </p>
        )}

        <div className="mt-5 flex items-center justify-between text-[13px] text-slate-500">
          <span>Hiển thị {filtered.length} lớp học</span>
          <span className="flex items-center gap-1.5">
            <button aria-label="Trang trước" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-300">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 font-bold text-white">1</button>
            <button aria-label="Trang sau" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-300">
              <ChevronRight className="h-4 w-4" />
            </button>
          </span>
        </div>
      </div>

      <CreateClassModal open={createOpen} initial={editing} onClose={() => { setCreateOpen(false); setEditing(null); }} onSubmit={handleCreate} />
      <ClassDetailModal classInfo={viewing} onClose={() => setViewing(null)} />
      <ConfirmDeleteModal classInfo={deleting} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) { setClasses((p) => p.filter((x) => x.id !== deleting.id)); showToast(`Đã xóa lớp ${deleting.code}`); } setDeleting(null); }} />
      <Toast message={toast} />
    </TeacherShell>
  );
}
