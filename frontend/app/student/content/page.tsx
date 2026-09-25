"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Link2,
  List,
  MoreVertical,
  PlayCircle,
  Search,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import Modal from "../../teacher/components/Modal";
import { Donut, Progress, SectionHead, TONE_BOX } from "../components/student-shared";
import { contentGroups, featuredDocs, recentActivities } from "@/lib/mock/student";
import type { ContentItemState, ContentItemType } from "@/lib/types/student";

const CATS = [
  { id: "all", label: "Tất cả", Icon: List },
  { id: "lesson", label: "Bài học", Icon: BookIcon },
  { id: "doc", label: "Tài liệu", Icon: FileText },
  { id: "video", label: "Video", Icon: PlayCircle },
  { id: "link", label: "Liên kết", Icon: Link2 },
  { id: "other", label: "Khác", Icon: MoreVertical },
] as const;

function BookIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function TypeIcon({ type }: { type: ContentItemType }) {
  const cls = "h-5 w-5";
  if (type === "video") return <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><PlayCircle className={cls} /></span>;
  if (type === "doc") return <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-500"><FileText className={cls} /></span>;
  if (type === "link") return <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500"><Link2 className={cls} /></span>;
  return <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-50 text-orange-500"><CheckSquareIcon /></span>;
}

function CheckSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function StateIcon({ state }: { state: ContentItemState }) {
  if (state === "done") return <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />;
  if (state === "doing") return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-blue-500"><span className="h-2 w-2 rounded-full bg-blue-500" /></span>;
  return <Circle className="h-5 w-5 shrink-0 text-slate-300" />;
}

export default function StudentContentPage() {
  const [topSearch, setTopSearch] = useState("");
  const [classFilter, setClassFilter] = useState("Tất cả lớp học");
  const [kindFilter, setKindFilter] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [undoneIds, setUndoneIds] = useState<string[]>([]);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  const stateOf = (id: string, dflt: ContentItemState): ContentItemState => {
    if (doneIds.includes(id)) return "done";
    if (undoneIds.includes(id)) return "todo";
    return dflt;
  };

  const groups = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    return contentGroups
      .filter((g) => (classFilter === "Tất cả lớp học" ? true : g.code === classFilter))
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => {
          if (kindFilter === "Bài học" && !it.title.startsWith("Bài")) return false;
          if (kindFilter === "Tài liệu" && it.type !== "doc") return false;
          if (kindFilter === "Video" && it.type !== "video") return false;
          if (cat === "lesson" && !it.title.startsWith("Bài")) return false;
          if (cat === "doc" && it.type !== "doc") return false;
          if (cat === "video" && it.type !== "video") return false;
          if (cat === "link" && it.type !== "link") return false;
          if (cat === "other" && it.type !== "other") return false;
          if (q && !`${it.title} ${it.meta}`.toLowerCase().includes(q)) return false;
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [classFilter, kindFilter, query, topSearch, cat]);

  const allItems = useMemo(() => contentGroups.flatMap((g) => g.items), []);
  const done = allItems.filter((i) => stateOf(i.id, i.state) === "done").length;
  const doing = allItems.filter((i) => stateOf(i.id, i.state) === "doing").length;
  const todo = allItems.length - done - doing;
  const pct = allItems.length === 0 ? 0 : Math.round((done / allItems.length) * 100);

  const toggleDone = (id: string, title: string, current: ContentItemState) => {
    if (current === "done") {
      setUndoneIds((p) => (p.includes(id) ? p : [...p, id]));
      setDoneIds((p) => p.filter((x) => x !== id));
      showToast(`Đã bỏ đánh dấu "${title}"`);
    } else {
      setDoneIds((p) => (p.includes(id) ? p : [...p, id]));
      setUndoneIds((p) => p.filter((x) => x !== id));
      showToast(`Đã hoàn thành "${title}" 🎉`);
    }
  };

  return (
    <StudentShell activeId="content" searchPlaceholder="Tìm kiếm bài học, tài liệu, khóa học..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Nội dung học tập</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Xem và truy cập các bài học, tài liệu của các lớp học bạn đang tham gia</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
            <label className="block text-[12.5px] text-slate-500">Lớp học
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-white px-3 text-[13px] outline-none ring-1 ring-slate-200">
                {["Tất cả lớp học", "WEB301", "PY101", "DB201", "WEB302"].map((o) => (<option key={o}>{o}</option>))}
              </select>
            </label>
            <label className="block text-[12.5px] text-slate-500">Nội dung
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-white px-3 text-[13px] outline-none ring-1 ring-slate-200">
                {["Tất cả", "Bài học", "Tài liệu", "Video"].map((o) => (<option key={o}>{o}</option>))}
              </select>
            </label>
            <span className="relative block self-end">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm bài học, tài liệu..."
                className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-[13px] outline-none ring-1 ring-slate-200 placeholder:text-slate-400" />
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1 rounded-xl border border-slate-200/70 bg-white p-2">
            {CATS.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${cat === c.id ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>
                <c.Icon className="h-4 w-4" /> {c.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {groups.map((g) => (
              <article key={g.classId} className="rounded-xl border border-slate-200/70 bg-white p-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex gap-3 md:w-[300px] md:shrink-0">
                    <div className={`grid h-28 w-28 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-4xl ${g.coverGradient}`}>
                      <span aria-hidden>{g.coverEmoji}</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[15.5px] font-extrabold leading-snug">{g.name}</h2>
                      <span className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] font-bold text-blue-600">{g.code}</span>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[9px] font-bold text-white">{g.teacher.charAt(0)}</span>
                        {g.teacher}
                        <span className={`ml-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${g.status === "finished" ? "bg-slate-100 text-slate-500" : g.status === "upcoming" ? "bg-orange-50 text-orange-500" : "bg-green-100/80 text-green-700"}`}>
                          {g.status === "finished" ? "Đã kết thúc" : g.status === "upcoming" ? "Sắp bắt đầu" : "Đang học"}
                        </span>
                      </p>
                      <div className="mt-2">
                        <p className="flex justify-between text-[11.5px] text-slate-500"><span>Tiến độ học tập</span><b className="text-slate-700">{g.progress}%</b></p>
                        <Progress value={g.progress} />
                        <p className="mt-0.5 text-[11px] text-slate-400">Hoàn thành {g.lessonsDone} / {g.lessonsTotal} bài học</p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-right">
                      <button onClick={() => showToast(`Mở toàn bộ ${g.code} (demo)`)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">Xem tất cả →</button>
                    </div>
                    <ul className="space-y-2.5">
                      {g.items.map((it) => {
                        const st = stateOf(it.id, it.state);
                        const key = `${g.classId}:${it.id}`;
                        return (
                          <li key={it.id} className="flex items-center gap-2.5">
                            <TypeIcon type={it.type} />
                            <button onClick={() => toggleDone(it.id, it.title, st)} className="min-w-0 flex-1 text-left">
                              <b className="block truncate text-[13px]">{it.title}</b>
                              <span className="block truncate text-[11.5px] text-slate-400">{it.meta}</span>
                            </button>
                            <StateIcon state={st} />
                            <span className="relative">
                              <button onClick={() => setMenuKey(menuKey === key ? null : key)} aria-label="Tùy chọn" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {menuKey === key && (
                                <>
                                  <button aria-label="Đóng" onClick={() => setMenuKey(null)} className="fixed inset-0 z-10 cursor-default" />
                                  <span className="absolute right-0 top-full z-20 w-48 overflow-hidden rounded-xl border bg-white py-1 text-left shadow-xl">
                                    <button onClick={() => { setMenuKey(null); toggleDone(it.id, it.title, st); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">
                                      {st === "done" ? "Đánh dấu chưa học" : "Đánh dấu hoàn thành"}
                                    </button>
                                    <button onClick={() => { setMenuKey(null); showToast(`Đang tải "${it.title}" (demo)`); }} className="block w-full px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50">Tải xuống</button>
                                  </span>
                                </>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
            {groups.length === 0 && <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500">Không tìm thấy nội dung nào.</p>}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="text-[15px] font-extrabold">📊 Tiến độ tổng quan</h2>
            <div className="mt-2"><Donut pct={pct} centerTop={`${pct}%`} centerBottom="" /></div>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Đã hoàn thành <b className="ml-auto">{done}</b></li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Đang học <b className="ml-auto">{doing}</b></li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Chưa học <b className="ml-auto">{todo}</b></li>
            </ul>
            <button onClick={() => setProgressOpen(true)} className="mt-3 w-full rounded-lg border border-blue-200 py-2 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">Xem chi tiết tiến độ →</button>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <SectionHead title="⏳ Hoạt động gần đây" onAction={() => showToast("Mở nhật ký hoạt động (demo)")} />
            <ul className="space-y-3">
              {recentActivities.map((a) => (
                <li key={a.id} className="flex gap-2.5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE_BOX[a.tone]}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2"><b className="text-[12.5px]">{a.title}</b><span className="shrink-0 text-[10.5px] text-slate-400">{a.time}</span></span>
                    <span className="block truncate text-[11.5px] text-slate-500">{a.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <SectionHead title="📄 Tài liệu nổi bật" onAction={() => showToast("Mở kho tài liệu (demo)")} />
            <ul className="space-y-3">
              {featuredDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500"><FileText className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[12.5px]">{d.title}</b>
                    <span className="block text-[11px] text-slate-400">{d.meta}</span>
                  </span>
                  <button onClick={() => showToast(`Đang tải "${d.title}" (demo)`)} aria-label={`Tải ${d.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50">
                    <Download className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Modal open={progressOpen} onClose={() => setProgressOpen(false)} title="Chi tiết tiến độ">
        <ul className="space-y-3">
          {contentGroups.map((g) => (
            <li key={g.classId}>
              <p className="flex justify-between text-[13px]"><b>{g.name} ({g.code})</b><span className="text-slate-500">{g.lessonsDone}/{g.lessonsTotal}</span></p>
              <div className="mt-1"><Progress value={g.progress} /></div>
            </li>
          ))}
        </ul>
      </Modal>

      <Toast message={toast} />
    </StudentShell>
  );
}
