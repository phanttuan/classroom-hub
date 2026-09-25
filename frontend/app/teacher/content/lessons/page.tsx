"use client";

import { useMemo, useRef, useState } from "react";
import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import TeacherShell, { Toast } from "../../components/TeacherShell";
import Modal from "../../components/Modal";
import { lessonCourseOptions, lessonList, lessonModules } from "@/lib/mock/teacher-lessons";
import type { LessonModule, TeacherLesson } from "@/lib/types/teacher";

function LessonForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (v: { title: string; description: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="space-y-3.5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Tên bài học *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bài 4: HTML cơ bản"
          className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Mô tả</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Mô tả ngắn..."
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onClick={() => {
          if (title.trim().length < 3) { setError("Tên bài học ít nhất 3 ký tự."); return; }
          onSubmit({ title: title.trim(), description: desc.trim() || "Chưa có mô tả." });
        }} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Tạo bài học
        </button>
      </div>
    </div>
  );
}

export default function TeacherLessonsPage() {
  const [topSearch, setTopSearch] = useState("");
  const [courseId, setCourseId] = useState("WEB301");
  const [courseOpen, setCourseOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Thứ tự tăng dần");
  const [modules, setModules] = useState<LessonModule[]>(lessonModules);
  const [expandedMods, setExpandedMods] = useState<string[]>(["mod-1"]);
  const [selectedLessonNo, setSelectedLessonNo] = useState(1);
  const [lessons, setLessons] = useState<TeacherLesson[]>(lessonList);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [modMenuId, setModMenuId] = useState<string | null>(null);
  const [createLessonOpen, setCreateLessonOpen] = useState(false);
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [detail, setDetail] = useState<TeacherLesson | null>(null);
  const [deleting, setDeleting] = useState<TeacherLesson | null>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  };

  const course = lessonCourseOptions.find((c) => c.id === courseId) ?? lessonCourseOptions[0];

  const filteredLessons = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = q ? lessons.filter((l) => l.title.toLowerCase().includes(q)) : lessons;
    if (sort === "Thứ tự giảm dần") list = [...list].sort((a, b) => b.no - a.no);
    else if (sort === "Mới cập nhật nhất") list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    else list = [...list].sort((a, b) => a.no - b.no);
    return list;
  }, [lessons, query, topSearch, sort]);

  const stats = [
    { label: "Tổng bài học", value: 12, icon: FileText, cls: "bg-blue-50 text-blue-600" },
    { label: "Đã xuất bản", value: 9, icon: CheckCircle2, cls: "bg-green-50 text-green-600" },
    { label: "Chưa xuất bản", value: 3, icon: Clock, cls: "bg-orange-50 text-orange-500" },
    { label: "Đã lưu trữ", value: 0, icon: Archive, cls: "bg-slate-100 text-slate-500" },
  ];

  const addLesson = (v: { title: string; description: string }) => {
    const no = Math.max(...lessons.map((l) => l.no), 0) + 1;
    setLessons((p) => [...p, { id: `les-${Date.now()}`, no, title: v.title.replace(/^Bài \d+:\s*/i, ""), description: v.description, duration: "10:00", docCount: 0, quizCount: 0, status: "draft", updatedAt: "15/09/2026", thumbGradient: "from-slate-200 via-slate-100 to-white" }]);
    setModules((p) => p.map((m) => (m.id === "mod-1" ? { ...m, lessonCount: m.lessonCount + 1, lessons: [...m.lessons, { no, title: v.title, status: "draft" as const }] } : m)));
    setCreateLessonOpen(false);
    showToast("Đã thêm bài học (nháp)");
  };

  const addModule = () => {
    if (moduleName.trim().length < 3) { showToast("Tên module ít nhất 3 ký tự"); return; }
    setModules((p) => [...p, { id: `mod-${Date.now()}`, title: moduleName.trim(), lessonCount: 0, lessons: [] }]);
    setModuleName("");
    setCreateModuleOpen(false);
    showToast("Đã thêm module");
  };

  return (
    <TeacherShell activeId="content" activeHref="/teacher/content/lessons"
      searchPlaceholder="Tìm kiếm khóa học, bài học, tài liệu..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <p className="text-[13px] text-slate-500"><ChevronLeft className="inline h-3.5 w-3.5" /> Nội dung học tập <span className="mx-1">›</span> <span className="font-medium text-slate-700">Bài học</span></p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Bài học</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Quản lý bài học trong các khóa học của bạn</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="relative">
            <button onClick={() => setCourseOpen((v) => !v)} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-2.5 text-left shadow-sm">
              <span className="grid h-10 w-14 place-items-center rounded-lg bg-gradient-to-br from-amber-100 to-stone-300 text-2xl">💻</span>
              <span>
                <span className="block text-[11px] text-slate-400">Khóa học</span>
                <span className="block text-[14px] font-bold">{course.title}</span>
                <span className="block text-[11px] text-slate-400">{course.code}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {courseOpen && (
              <span className="absolute right-0 top-[calc(100%+6px)] z-20 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {lessonCourseOptions.map((c) => (
                  <button key={c.id} onClick={() => { setCourseId(c.id); setCourseOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-[13px] hover:bg-slate-50 ${c.id === courseId ? "font-bold text-blue-600" : "text-slate-600"}`}>
                    {c.title} <span className="text-slate-400">({c.code})</span>
                  </button>
                ))}
              </span>
            )}
          </span>
          <button onClick={() => setCreateLessonOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-3 text-[14px] font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Tạo bài học
          </button>
        </div>
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

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Cây module */}
        <section className="rounded-xl border border-slate-200/70 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-bold">Cấu trúc khóa học</h2>
            <button onClick={() => setCreateModuleOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
              <Plus className="h-4 w-4" /> Thêm module
            </button>
          </div>
          <ul className="space-y-1">
            {modules.map((m, idx) => {
              const open = expandedMods.includes(m.id);
              const colors = ["text-orange-500", "text-blue-500", "text-purple-500", "text-slate-400"];
              return (
                <li key={m.id} className="rounded-xl">
                  <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                    <button onClick={() => setExpandedMods((p) => (open ? p.filter((x) => x !== m.id) : [...p, m.id]))} aria-label="Mở module" className="grid h-6 w-6 place-items-center text-slate-400">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {open ? <FolderOpen className={`h-5 w-5 ${colors[idx % colors.length]}`} /> : <Folder className={`h-5 w-5 ${colors[idx % colors.length]}`} />}
                    <button onClick={() => setExpandedMods((p) => (open ? p.filter((x) => x !== m.id) : [...p, m.id]))} className="flex-1 text-left">
                      <span className="block text-[13.5px] font-bold">{m.title}</span>
                      <span className="block text-[12px] text-slate-400">{m.lessonCount} bài học</span>
                    </button>
                    <span className="relative">
                      <button onClick={() => setModMenuId(modMenuId === m.id ? null : m.id)} aria-label="Tùy chọn module" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {modMenuId === m.id && (
                        <span className="absolute right-0 top-full z-20 w-40 overflow-hidden rounded-xl border bg-white py-1 shadow-xl">
                          <button onClick={() => { setModMenuId(null); showToast(`Đổi tên "${m.title}" (demo)`); }} className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Đổi tên</button>
                          <button onClick={() => { setModules((p) => p.filter((x) => x.id !== m.id)); setModMenuId(null); showToast("Đã xóa module"); }} className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Xóa</button>
                        </span>
                      )}
                    </span>
                  </div>
                  {open && (
                    <ul className="ml-5 space-y-1 border-l-2 border-slate-100 pl-3">
                      {m.lessons.map((l) => (
                        <li key={l.no}>
                          <button onClick={() => setSelectedLessonNo(l.no)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${selectedLessonNo === l.no ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-bold ${selectedLessonNo === l.no ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}>{l.no}</span>
                            <span className="flex-1 truncate">{l.title}</span>
                            {l.status === "published" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> : <Clock className="h-4 w-4 shrink-0 text-orange-400" />}
                          </button>
                        </li>
                      ))}
                      <li>
                        <button onClick={() => setCreateLessonOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-blue-300 px-2.5 py-2.5 text-[13px] font-medium text-blue-600 hover:bg-blue-50">
                          <Plus className="h-4 w-4" /> Thêm bài học
                        </button>
                      </li>
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Danh sách bài học */}
        <section className="rounded-xl border border-slate-200/70 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-[16px] font-bold">Danh sách bài học</h2>
              <p className="text-[13px] text-slate-500">Module 1: Giới thiệu ({filteredLessons.length} bài học)</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm bài học..."
                  className="h-10 w-[220px] rounded-lg bg-slate-100 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
              </span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none">
                <option>Thứ tự tăng dần</option>
                <option>Thứ tự giảm dần</option>
                <option>Mới cập nhật nhất</option>
              </select>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {filteredLessons.map((l) => (
              <li key={l.id} className="flex gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:shadow-md hover:shadow-blue-50">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-[13px] font-bold text-blue-600">{l.no}</span>
                <button onClick={() => setDetail(l)} className={`relative h-[86px] w-[124px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${l.thumbGradient}`} aria-label={`Xem ${l.title}`}>
                  <span className="absolute inset-0 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white"><Play className="h-4 w-4 fill-white" /></span></span>
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">{l.duration}</span>
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{l.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-slate-500">{l.description}</span>
                  <span className="mt-1.5 flex flex-wrap gap-x-4 text-[12.5px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-slate-400" /> {l.docCount} tài liệu</span>
                    <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-blue-500" /> {l.quizCount} bài kiểm tra</span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end justify-between">
                  <span className="relative">
                    <button onClick={() => setMenuId(menuId === l.id ? null : l.id)} aria-label="Tùy chọn" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></button>
                    {menuId === l.id && (
                      <span className="absolute right-0 top-full z-20 w-44 overflow-hidden rounded-xl border bg-white py-1 text-left shadow-xl">
                        <button onClick={() => { setMenuId(null); setDetail(l); }} className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" /> Xem</button>
                        <button onClick={() => { setMenuId(null); showToast(`Sửa "${l.title}" (demo)`); }} className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Sửa</button>
                        <button onClick={() => { setMenuId(null); setDeleting(l); }} className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Xóa</button>
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium ${l.status === "published" ? "bg-green-100/80 text-green-700" : "bg-orange-100/70 text-orange-600"}`}>
                    {l.status === "published" ? "Đã xuất bản" : "Chưa xuất bản"}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11.5px] text-slate-400"><CalendarDays className="h-3.5 w-3.5 shrink-0" /> Cập nhật: {l.updatedAt}</span>
                </span>
              </li>
            ))}
          </ul>
          <button onClick={() => setCreateLessonOpen(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-blue-300 py-3.5 text-[14px] font-medium text-blue-600 hover:bg-blue-50">
            <Plus className="h-4 w-4" /> Thêm bài học
          </button>
        </section>
      </div>

      <Modal open={createLessonOpen} onClose={() => setCreateLessonOpen(false)} title="Tạo bài học mới">
        <LessonForm key={String(createLessonOpen)} onClose={() => setCreateLessonOpen(false)} onSubmit={addLesson} />
      </Modal>
      <Modal open={createModuleOpen} onClose={() => setCreateModuleOpen(false)} title="Thêm module" widthClass="max-w-[420px]">
        <div className="space-y-3">
          <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="VD: Module 5: Ôn tập"
            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreateModuleOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button onClick={addModule} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Thêm</button>
          </div>
        </div>
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết bài học">
        {detail && (
          <div className="space-y-2 text-sm">
            <p className="text-[16px] font-bold">Bài {detail.no}: {detail.title}</p>
            <p className="text-slate-500">{detail.description}</p>
            <p className="text-slate-500">Thời lượng {detail.duration} • {detail.docCount} tài liệu • {detail.quizCount} bài kiểm tra • Cập nhật {detail.updatedAt}</p>
          </div>
        )}
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Xóa bài học?" widthClass="max-w-[420px]">
        {deleting && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">Xóa <b className="text-slate-900">{deleting.title}</b>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="rounded-lg px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={() => { setLessons((p) => p.filter((x) => x.id !== deleting.id)); setDeleting(null); showToast("Đã xóa bài học"); }} className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700">Xóa</button>
            </div>
          </div>
        )}
      </Modal>
      <Toast message={toast} />
    </TeacherShell>
  );
}
