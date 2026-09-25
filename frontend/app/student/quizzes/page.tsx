"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Search,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import Modal from "../../teacher/components/Modal";
import { StatCard, TONE_BOX } from "../components/student-shared";
import { studentQuizzes } from "@/lib/mock/student";
import type { QuizQuestion, StudentQuiz } from "@/lib/types/student";

type Tab = "all" | "todo" | "done" | "overdue";

const fmt2 = (n: number) => String(n).padStart(2, "0");

function QuizRunner({
  quiz,
  onClose,
  onFinish,
}: {
  quiz: StudentQuiz;
  onClose: () => void;
  onFinish: (score10: number, correct: number, total: number) => void;
}) {
  const qs: QuizQuestion[] = useMemo(
    () =>
      quiz.sample ?? [
        { id: "g1", question: `Câu hỏi ôn tập 1 — ${quiz.title}`, options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"], answer: 0 },
        { id: "g2", question: `Câu hỏi ôn tập 2 — ${quiz.title}`, options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"], answer: 1 },
        { id: "g3", question: `Câu hỏi ôn tập 3 — ${quiz.title}`, options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"], answer: 2 },
        { id: "g4", question: `Câu hỏi ôn tập 4 — ${quiz.title}`, options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"], answer: 3 },
        { id: "g5", question: `Câu hỏi ôn tập 5 — ${quiz.title}`, options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"], answer: 0 },
      ],
    [quiz],
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => qs.map(() => null));
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<{ correct: number; total: number; score10: number } | null>(null);
  const [deadline] = useState(() => Date.now() + quiz.minutes * 60 * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remain = Math.max(0, Math.floor((deadline - now) / 1000));
  const finishedRef = useRef(false);

  const submit = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const correct = qs.filter((q, i) => answers[i] === q.answer).length;
    const score10 = Math.round((correct / qs.length) * 100) / 10;
    setDone({ correct, total: qs.length, score10 });
    onFinish(score10, correct, qs.length);
  };

  useEffect(() => {
    if (remain === 0 && !done) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remain]);

  const q = qs[idx];

  if (done) {
    return (
      <div className="py-2 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
        <h3 className="mt-2 text-[19px] font-extrabold">Hoàn thành bài kiểm tra!</h3>
        <p className="mt-1 text-[26px] font-extrabold text-blue-600">{done.score10.toFixed(1)}<span className="text-[15px] font-medium text-slate-400"> / 10</span></p>
        <p className="mt-1 text-[13px] text-slate-500">Đúng {done.correct}/{done.total} câu hỏi demo</p>
        <button onClick={onClose} className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Về danh sách</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <b>Câu {idx + 1}/{qs.length}</b>
        <span className={`font-bold tabular-nums ${remain < 300 ? "text-red-500" : "text-blue-600"}`}>
          {fmt2(Math.floor(remain / 60))}:{fmt2(remain % 60)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-blue-600" style={{ width: `${((idx + 1) / qs.length) * 100}%` }} />
      </div>
      <p className="mt-3 text-[15px] font-bold leading-snug">{q.question}</p>
      <ul className="mt-3 space-y-2">
        {q.options.map((op, i) => (
          <li key={i}>
            <button onClick={() => setAnswers((p) => p.map((a, j) => (j === idx ? i : a)))}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition ${answers[idx] === i ? "border-blue-600 bg-blue-50 font-semibold text-blue-700" : "border-slate-200 hover:border-blue-300"}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${answers[idx] === i ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {["A", "B", "C", "D"][i]}
              </span>
              {op}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between gap-2">
        <button onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Câu trước</button>
        {idx < qs.length - 1 ? (
          <button onClick={() => setIdx((v) => v + 1)} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Câu tiếp →</button>
        ) : confirm ? (
          <span className="flex gap-2">
            <button onClick={() => setConfirm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Xem lại</button>
            <button onClick={submit} className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700">Xác nhận nộp</button>
          </span>
        ) : (
          <button onClick={() => setConfirm(true)} className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700">
            Nộp bài ({answers.filter((a) => a !== null).length}/{qs.length})
          </button>
        )}
      </div>
    </div>
  );
}

export default function StudentQuizzesPage() {
  const [topSearch, setTopSearch] = useState("");
  const [classFilter, setClassFilter] = useState("Tất cả lớp học");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [kindFilter, setKindFilter] = useState("Tất cả loại kiểm tra");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<StudentQuiz[]>(studentQuizzes);
  const [selectedId, setSelectedId] = useState("sq2");
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState<{ score10: number } | null>(null);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  // đồng hồ đếm ngược của panel (bài đang làm)
  const [panelDeadline] = useState(() => Date.now() + (35 * 60 + 20) * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remain = Math.max(0, Math.floor((panelDeadline - now) / 1000));

  const counts = useMemo(
    () => ({
      total: items.length,
      todo: items.filter((i) => i.status === "todo").length,
      done: items.filter((i) => i.status === "done" || i.status === "doing").length,
      overdue: items.filter((i) => i.status === "overdue").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...items];
    if (tab === "todo") list = list.filter((i) => i.status === "todo");
    if (tab === "done") list = list.filter((i) => i.status === "done" || i.status === "doing");
    if (tab === "overdue") list = list.filter((i) => i.status === "overdue");
    if (classFilter !== "Tất cả lớp học") list = list.filter((i) => i.classCode === classFilter);
    if (statusFilter !== "Tất cả trạng thái") {
      const map: Record<string, StudentQuiz["status"]> = { "Chưa làm": "todo", "Đang làm": "doing", "Đã làm": "done", "Quá hạn": "overdue" };
      list = list.filter((i) => (statusFilter === "Đã làm" ? i.status === "done" || i.status === "doing" : i.status === map[statusFilter]));
    }
    if (kindFilter !== "Tất cả loại kiểm tra") list = list.filter((i) => i.title.toLowerCase().includes("giữa kỳ") === (kindFilter === "Giữa kỳ"));
    if (q) list = list.filter((i) => `${i.title} ${i.classCode} ${i.courseName}`.toLowerCase().includes(q));
    return list;
  }, [items, tab, classFilter, statusFilter, kindFilter, query, topSearch]);

  const selected = items.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  const rightAction = (quiz: StudentQuiz) => {
    if (quiz.status === "done")
      return (
        <span className="flex flex-col items-end gap-1.5">
          <span className="whitespace-nowrap rounded-md bg-green-100/80 px-2.5 py-1 text-[11.5px] font-medium text-green-700">Đã làm</span>
          <span className="rounded-lg bg-green-50 px-3 py-1.5 text-[15px] font-extrabold text-green-600">{quiz.score?.toFixed(1)} <span className="text-[12px] font-medium text-slate-400">/ 10</span></span>
        </span>
      );
    if (quiz.status === "doing")
      return (
        <span className="flex flex-col items-end gap-1.5">
          <span className="whitespace-nowrap rounded-md bg-blue-50 px-2.5 py-1 text-[11.5px] font-medium text-blue-600">Đang làm</span>
          <button onClick={() => { setSelectedId(quiz.id); setRunnerOpen(true); }} className="rounded-lg bg-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-blue-700">Tiếp tục làm ›</button>
        </span>
      );
    if (quiz.status === "overdue")
      return (
        <span className="flex flex-col items-end gap-1.5">
          <span className="whitespace-nowrap rounded-md bg-red-50 px-2.5 py-1 text-[11.5px] font-medium text-red-500">Quá hạn</span>
          <button onClick={() => showToast("Đã hết hạn làm bài")} className="rounded-lg bg-slate-100 px-4 py-2 text-[12.5px] font-semibold text-slate-400">Xem đề</button>
        </span>
      );
    return (
      <span className="flex flex-col items-end gap-1.5">
        <span className="whitespace-nowrap rounded-md bg-orange-50 px-2.5 py-1 text-[11.5px] font-medium text-orange-500">Chưa làm</span>
        <button onClick={() => { setSelectedId(quiz.id); setRunnerOpen(true); }} className="rounded-lg border border-blue-200 px-4 py-2 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">Vào làm</button>
      </span>
    );
  };

  return (
    <StudentShell activeId="quizzes" searchPlaceholder="Tìm kiếm bài kiểm tra, lớp học, môn học..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Kiểm tra trắc nghiệm</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Làm bài kiểm tra và xem lại kết quả của bạn</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_1.4fr]">
            {[["Lớp học", classFilter, setClassFilter, ["Tất cả lớp học", "WEB301", "PY101", "DB201"]],
              ["Trạng thái", statusFilter, setStatusFilter, ["Tất cả trạng thái", "Chưa làm", "Đang làm", "Đã làm", "Quá hạn"]],
              ["Loại kiểm tra", kindFilter, setKindFilter, ["Tất cả loại kiểm tra", "Giữa kỳ", "Kiểm tra nhanh"]]].map(([label, val, set, opts]) => (
              <label key={label as string} className="block text-[12.5px] text-slate-500">{label as string}
                <select value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-white px-2.5 text-[13px] outline-none ring-1 ring-slate-200">
                  {(opts as string[]).map((o) => (<option key={o}>{o}</option>))}
                </select>
              </label>
            ))}
            <span className="relative block self-end">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm bài kiểm tra..."
                className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-[13px] outline-none ring-1 ring-slate-200 placeholder:text-slate-400" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<FileText className="h-6 w-6" />} iconCls="bg-blue-50 text-blue-600" value={String(counts.total)} label="Tổng số bài kiểm tra" />
            <StatCard icon={<CheckCircle2 className="h-6 w-6" />} iconCls="bg-green-50 text-green-600" value={String(counts.done)} label="Đã hoàn thành" />
            <StatCard icon={<Clock className="h-6 w-6" />} iconCls="bg-orange-50 text-orange-500" value={String(counts.todo)} label="Chưa làm" />
            <StatCard icon={<FileText className="h-6 w-6" />} iconCls="bg-red-50 text-red-500" value={String(counts.overdue)} label="Đã quá hạn" />
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-200">
            {([["all", `Tất cả (${counts.total})`], ["todo", `Chưa làm (${counts.todo})`], ["done", `Đã làm (${counts.done})`], ["overdue", `Quá hạn (${counts.overdue})`]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap px-3.5 pb-2.5 pt-1 text-[13.5px] font-medium ${tab === id ? "text-blue-600" : "text-slate-500"}`}>
                {label}
                {tab === id && <span className="mt-1 block h-[2.5px] rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>

          <ul className="mt-3 space-y-3">
            {filtered.map((quiz) => (
              <li key={quiz.id} onClick={() => setSelectedId(quiz.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${selectedId === quiz.id ? "border-blue-200 bg-blue-50/60" : "border-slate-200/70 bg-white hover:border-blue-100"}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[19px] font-extrabold ${TONE_BOX[quiz.status === "done" ? "purple" : quiz.status === "doing" ? "blue" : quiz.status === "overdue" ? "red" : "orange"]}`}>?</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px]">{quiz.title}</b>
                  <span className="block truncate text-[11.5px] text-slate-400">{quiz.classCode} - {quiz.courseName}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-slate-400">
                    <span>📅 {quiz.datetime}</span><span>☰ {quiz.questions} câu hỏi</span><span>🕐 {quiz.minutes} phút</span><span>✦ {quiz.points} điểm</span>
                  </span>
                </span>
                {rightAction(quiz)}
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </li>
            ))}
            {filtered.length === 0 && <li className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500">Không có bài kiểm tra nào.</li>}
          </ul>
        </div>

        {selected && (
          <aside className="h-fit min-w-0 space-y-4 rounded-xl border border-slate-200/70 bg-white p-4 xl:sticky xl:top-[84px]">
            <div className="flex items-start gap-2.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-[19px] font-extrabold text-purple-600">?</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-extrabold leading-snug">{selected.title}</h2>
                <p className="text-[12px] text-slate-400">{selected.classCode} - {selected.courseName}</p>
              </div>
              {selected.status === "doing" && <span className="shrink-0 whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600">Đang làm</span>}
            </div>

            <div>
              <h3 className="text-[13.5px] font-bold">Thông tin chung</h3>
              <ul className="mt-2 space-y-2 text-[12.5px]">
                <li className="flex justify-between gap-2"><span className="text-slate-400">📅 Thời gian làm bài</span><b className="text-right">{selected.datetime}</b></li>
                <li className="flex justify-between gap-2"><span className="text-slate-400">🕐 Thời lượng</span><b>{selected.minutes} phút</b></li>
                <li className="flex justify-between gap-2"><span className="text-slate-400">📝 Số câu hỏi</span><b>{selected.questions} câu</b></li>
                <li className="flex justify-between gap-2"><span className="text-slate-400">⭐ Tổng điểm</span><b>{selected.points} điểm</b></li>
                <li className="flex justify-between gap-2"><span className="shrink-0 text-slate-400">📚 Nội dung chính</span>
                  <span className="flex flex-wrap justify-end gap-1">{selected.tags.map((t) => (<span key={t} className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">{t}</span>))}</span>
                </li>
                <li className="flex justify-between gap-2"><span className="text-slate-400">📋 Hình thức</span><b className="text-right">Trắc nghiệm (1 đáp án đúng)</b></li>
                <li className="flex justify-between gap-2"><span className="text-slate-400">🏫 Lớp học</span><b className="text-right">{selected.classCode} - {selected.courseName}</b></li>
                <li className="flex justify-between gap-2"><span className="text-slate-400">👤 Giảng viên</span><b className="flex items-center gap-1.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-slate-300 text-[10px] font-bold text-white">A</span> Nguyễn Văn A</b></li>
              </ul>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5">
              <b className="text-[13px]">Hướng dẫn làm bài</b>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[12px] leading-relaxed text-slate-500">
                <li>Đọc kỹ câu hỏi trước khi chọn đáp án.</li>
                <li>Mỗi câu chỉ có 1 đáp án đúng.</li>
                <li>Không được sử dụng tài liệu trong quá trình làm bài.</li>
                <li>Bài làm sẽ tự động nộp khi hết thời gian.</li>
                <li>Bạn có thể nộp bài sớm trước khi hết thời gian.</li>
              </ol>
            </div>

            {selected.status === "doing" && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold"><Clock className="h-4 w-4 text-blue-600" /> Thời gian còn lại</span>
                  <span className="text-right tabular-nums"><b className="text-[22px] font-extrabold text-blue-600">{fmt2(Math.floor(remain / 60))} : {fmt2(remain % 60)}</b>
                    <span className="block text-[10.5px] font-normal text-slate-400">Phút&nbsp;&nbsp;&nbsp;&nbsp;Giây</span></span>
                </p>
              </div>
            )}

            {selected.status === "done" ? (
              <button onClick={() => setResultOpen({ score10: selected.score ?? 0 })} className="w-full rounded-lg border border-blue-200 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50">Xem kết quả ›</button>
            ) : selected.status === "overdue" ? (
              <button onClick={() => showToast("Đã hết hạn làm bài")} className="w-full rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-400">Hết hạn làm bài</button>
            ) : (
              <button onClick={() => setRunnerOpen(true)} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                {selected.status === "doing" ? "Tiếp tục làm bài ›" : "Bắt đầu làm bài ›"}
              </button>
            )}
          </aside>
        )}
      </div>

      <Modal open={runnerOpen} onClose={() => setRunnerOpen(false)} title={selected?.title ?? "Làm bài"} widthClass="max-w-[560px]">
        {selected && (
          <QuizRunner key={selected.id} quiz={selected} onClose={() => setRunnerOpen(false)}
            onFinish={(score10) => {
              setItems((p) => p.map((i) => (i.id === selected.id ? { ...i, status: "done" as const, score: score10 } : i)));
              showToast(`Đã nộp bài — điểm demo ${score10.toFixed(1)}/10`);
            }} />
        )}
      </Modal>

      <Modal open={!!resultOpen} onClose={() => setResultOpen(null)} title="Kết quả bài kiểm tra" widthClass="max-w-[420px]">
        {selected && resultOpen && (
          <div className="py-2 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
            <p className="mt-2 text-[26px] font-extrabold text-blue-600">{(selected.score ?? resultOpen.score10).toFixed(1)}<span className="text-[15px] font-medium text-slate-400"> / 10</span></p>
            <p className="mt-1 text-[13px] text-slate-500">{selected.title}</p>
            <button onClick={() => setResultOpen(null)} className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Đóng</button>
          </div>
        )}
      </Modal>

      <Toast message={toast} />
    </StudentShell>
  );
}
