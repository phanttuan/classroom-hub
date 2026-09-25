"use client";

import { useMemo, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Eye,
  FileText,
  FolderOpen,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import TeacherShell, { Toast } from "../../components/TeacherShell";
import Modal from "../../components/Modal";
import {
  courseClassOptions,
  courseList,
  courseSortOptions,
  courseStatusOptions,
} from "@/lib/mock/teacher-courses";
import type { TeacherCourse } from "@/lib/types/teacher";

const STATUS_META: Record<TeacherCourse["status"], { label: string; cls: string }> = {
  active: { label: "Đang hoạt động", cls: "bg-green-100/90 text-green-700" },
  draft: { label: "Chưa xuất bản", cls: "bg-orange-100/90 text-orange-600" },
  archived: { label: "Đã lưu trữ", cls: "bg-white/90 text-slate-600" },
};

function CourseForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: TeacherCourse | null;
  onClose: () => void;
  onSubmit: (v: { title: string; classCode: string; description: string }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [classCode, setClassCode] = useState(initial?.classCode ?? "WEB301");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [error, setError] = useState("");
  return (
    <div className="space-y-3.5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Tên khóa học *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Lập trình Web nâng cao"
          className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Lớp học</label>
        <select value={classCode} onChange={(e) => setClassCode(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
          {courseClassOptions.filter((o) => o !== "Tất cả lớp học").map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Mô tả</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Mô tả ngắn về khóa học..."
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onClick={() => {
          if (title.trim().length < 3) { setError("Tên khóa học ít nhất 3 ký tự."); return; }
          onSubmit({ title: title.trim(), classCode, description: desc.trim() || "Chưa có mô tả." });
        }} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          {initial ? "Lưu" : "Tạo khóa học"}
        </button>
      </div>
    </div>
  );
}

export default function TeacherCoursesPage() {
  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState(courseClassOptions[0]);
  const [statusFilter, setStatusFilter] = useState(courseStatusOptions[0]);
  const [sort, setSort] = useState(courseSortOptions[0]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [courses, setCourses] = useState<TeacherCourse[]>(courseList);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherCourse | null>(null);
  const [detail, setDetail] = useState<TeacherCourse | null>(null);
  const [deleting, setDeleting] = useState<TeacherCourse | null>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  };

  const counts = useMemo(
    () => ({
      total: courses.length,
      active: courses.filter((c) => c.status === "active").length,
      draft: courses.filter((c) => c.status === "draft").length,
      archived: courses.filter((c) => c.status === "archived").length,
    }),
    [courses],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...courses];
    if (classFilter !== "Tất cả lớp học") list = list.filter((c) => c.classCode === classFilter);
    if (statusFilter !== "Tất cả trạng thái") {
      const map: Record<string, TeacherCourse["status"]> = {
        "Đang hoạt động": "active",
        "Chưa xuất bản": "draft",
        "Đã lưu trữ": "archived",
      };
      list = list.filter((c) => c.status === map[statusFilter]);
    }
    if (q) list = list.filter((c) => c.title.toLowerCase().includes(q) || c.classCode.toLowerCase().includes(q));
    if (sort === "Tên A-Z") list.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    if (sort === "Nhiều bài học nhất") list.sort((a, b) => b.lessonCount - a.lessonCount);
    return list;
  }, [courses, query, topSearch, classFilter, statusFilter, sort]);

  const stats = [
    { label: "Tổng khóa học", value: counts.total, icon: BookOpen, cls: "bg-blue-50 text-blue-600" },
    { label: "Đang hoạt động", value: counts.active, icon: CheckCircle2, cls: "bg-green-50 text-green-600" },
    { label: "Chưa xuất bản", value: counts.draft, icon: Clock, cls: "bg-orange-50 text-orange-500" },
    { label: "Đã lưu trữ", value: counts.archived, icon: Archive, cls: "bg-slate-100 text-slate-500" },
  ];

  const submitCourse = (v: { title: string; classCode: string; description: string }) => {
    if (editing) {
      setCourses((p) => p.map((c) => (c.id === editing.id ? { ...c, ...v } : c)));
      showToast("Đã lưu khóa học");
      setEditing(null);
    } else {
      setCourses((p) => [
        { id: `course-${Date.now()}`, title: v.title, classCode: v.classCode, description: v.description, moduleCount: 1, lessonCount: 0, updatedAt: "15/09/2026", status: "draft", coverGradient: "from-blue-100 via-sky-100 to-slate-200", coverEmoji: "📚" },
        ...p,
      ]);
      showToast("Đã tạo khóa học (nháp)");
    }
    setCreateOpen(false);
  };

  const card = (c: TeacherCourse) => (
    <article key={c.id} className="overflow-hidden rounded-xl border border-slate-200/70 bg-white transition hover:shadow-lg hover:shadow-slate-200">
      <div className={`relative grid h-[148px] place-items-center bg-gradient-to-br text-5xl ${c.coverGradient}`}>
        <span aria-hidden>{c.coverEmoji}</span>
        <span className={`absolute left-3 top-3 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium ${STATUS_META[c.status].cls}`}>
          {STATUS_META[c.status].label}
        </span>
        <span className="absolute right-3 top-3">
          <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} aria-label="Tùy chọn" className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-slate-600 shadow-sm hover:bg-white">
            <MoreVertical className="h-4 w-4" />
          </button>
          {openMenuId === c.id && (
            <span className="absolute right-0 top-[calc(100%+6px)] z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">
              <button onClick={() => { setOpenMenuId(null); setDetail(c); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4" /> Xem</button>
              <button onClick={() => { setOpenMenuId(null); setEditing(c); setCreateOpen(true); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /> Sửa</button>
              <button onClick={() => { setCourses((p) => p.map((x) => (x.id === c.id ? { ...x, status: "archived" as const } : x))); setOpenMenuId(null); showToast(`Đã lưu trữ "${c.title}"`); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50"><Archive className="h-4 w-4" /> Lưu trữ</button>
              <button onClick={() => { setOpenMenuId(null); setDeleting(c); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Xóa</button>
            </span>
          )}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-[15.5px] font-bold">{c.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-slate-500"><BookOpen className="h-3.5 w-3.5" /> Lớp: {c.classCode}</p>
        <p className="mt-1.5 line-clamp-2 min-h-[38px] text-[13px] text-slate-500">{c.description}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
          <span className="inline-flex items-center gap-1"><FolderOpen className="h-4 w-4 text-slate-400" /> {c.moduleCount} module</span>
          <span className="inline-flex items-center gap-1"><FileText className="h-4 w-4 text-blue-500" /> {c.lessonCount} bài học</span>
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-500"><CalendarDays className="h-4 w-4 text-slate-400" /> Cập nhật: {c.updatedAt}</p>
        <div className="mt-3 flex gap-2">
          {c.status === "archived" ? (
            <button onClick={() => setDetail(c)} className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">Xem nội dung</button>
          ) : (
            <button onClick={() => showToast(`Mở quản lý "${c.title}" (demo)`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
              <FolderOpen className="h-4 w-4" /> Quản lý nội dung
            </button>
          )}
          <button onClick={() => setDetail(c)} aria-label="Thống kê" className="grid w-11 place-items-center rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );

  return (
    <TeacherShell activeId="content" activeHref="/teacher/content/courses"
      searchPlaceholder="Tìm kiếm khóa học, lớp học, nội dung..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <p className="text-[13px] text-slate-500"><ChevronLeft className="inline h-3.5 w-3.5" /> Nội dung học tập <span className="mx-1">›</span> <span className="font-medium text-slate-700">Khóa học</span></p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Khóa học</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Quản lý các khóa học trong lớp học của bạn</p>
        </div>
        <button onClick={() => { setEditing(null); setCreateOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Tạo khóa học
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${s.cls}`}><s.icon className="h-6 w-6" /></span>
            <span><span className="block text-[13px] text-slate-500">{s.label}</span>
            <span className="block text-[22px] font-extrabold">{s.value}</span></span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200/70 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm khóa học..."
              className="h-10 w-full rounded-lg bg-slate-100 pl-10 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
          </div>
          {(["Lớp học", "Trạng thái", "Sắp xếp"] as const).map((label) => (
            <label key={label} className="text-[12px] text-slate-500">
              <span className="mb-1 block">{label}</span>
              <select
                value={label === "Lớp học" ? classFilter : label === "Trạng thái" ? statusFilter : sort}
                onChange={(e) => {
                  if (label === "Lớp học") setClassFilter(e.target.value);
                  else if (label === "Trạng thái") setStatusFilter(e.target.value);
                  else setSort(e.target.value);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none">
                {(label === "Lớp học" ? courseClassOptions : label === "Trạng thái" ? courseStatusOptions : courseSortOptions).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <span className="flex overflow-hidden rounded-lg border border-slate-200">
            <button onClick={() => setView("grid")} aria-label="Xem lưới" className={`grid h-10 w-11 place-items-center ${view === "grid" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setView("list")} aria-label="Xem danh sách" className={`grid h-10 w-11 place-items-center ${view === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50"}`}>
              <List className="h-4 w-4" />
            </button>
          </span>
        </div>

        {view === "grid" ? (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map(card)}</div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span className={`grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-2xl ${c.coverGradient}`}>{c.coverEmoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{c.title}</span>
                  <span className="block text-[12.5px] text-slate-500">Lớp {c.classCode} • {c.lessonCount} bài học • {STATUS_META[c.status].label}</span>
                </span>
                <button onClick={() => setDetail(c)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">Xem</button>
              </li>
            ))}
          </ul>
        )}
        {filtered.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Không tìm thấy khóa học nào.</p>}
      </div>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setEditing(null); }} title={editing ? "Sửa khóa học" : "Tạo khóa học mới"}>
        <CourseForm key={editing ? editing.id : String(createOpen)} initial={editing} onClose={() => { setCreateOpen(false); setEditing(null); }} onSubmit={submitCourse} />
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết khóa học">
        {detail && (
          <div className="space-y-2.5 text-sm">
            <p className="text-[16px] font-bold">{detail.title}</p>
            <p className="text-slate-500">Lớp: {detail.classCode} • {detail.moduleCount} module • {detail.lessonCount} bài học</p>
            <p className="text-slate-600">{detail.description}</p>
            <p className="text-[13px] text-slate-500">Cập nhật: {detail.updatedAt} • {STATUS_META[detail.status].label}</p>
          </div>
        )}
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Xóa khóa học?" widthClass="max-w-[420px]">
        {deleting && (
          <div className="space-y-4 text-sm text-slate-600">
            <p>Xóa <b className="text-slate-900">{deleting.title}</b>? Không thể hoàn tác.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="rounded-lg px-4 py-2.5 font-semibold hover:bg-slate-100">Hủy</button>
              <button onClick={() => { setCourses((p) => p.filter((x) => x.id !== deleting.id)); showToast("Đã xóa khóa học"); setDeleting(null); }} className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700">Xóa</button>
            </div>
          </div>
        )}
      </Modal>
      <Toast message={toast} />
    </TeacherShell>
  );
}
