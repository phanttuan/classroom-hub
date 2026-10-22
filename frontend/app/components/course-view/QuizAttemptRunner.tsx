"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CheckSquare, ChevronLeft, ChevronRight, CloudOff, Flag, Loader2, Save, Send, Timer } from "lucide-react";
import type { AttemptAnswerInput, AttemptInProgressDto, AttemptQuestionDto } from "@/lib/types/quiz";
import { fetchQuizAttempt, formatQuizApiError, saveQuizAnswers, submitQuizAttempt } from "@/lib/api/quiz-api";
import { formatCountdown } from "@/lib/quiz-utils";
import { formatDateTime, formatScore } from "@/lib/assignment-utils";
import { toast } from "@/app/components/common/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import CourseShell, { coursePathOf, useCourseContent } from "./CourseShell";
import CourseHero, { type HeroStat } from "./CourseHero";

interface QuizAttemptRunnerProps {
  courseId: string;
  quizId: string;
  attemptId: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/** Số câu hỏi mỗi trang trong trang làm bài */
const QUESTIONS_PER_PAGE = 10;

/**
 * Trang làm bài: toàn bộ câu hỏi trên một trang, lưu nháp tự động mỗi khi đổi đáp án,
 * đếm ngược theo hạn chót của máy chủ, hết giờ tự nộp.
 */
export default function QuizAttemptRunner({ courseId, quizId, attemptId }: QuizAttemptRunnerProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const coursePath = coursePathOf("STUDENT", courseId);
  const quizPath = `${coursePath}/quizzes/${quizId}`;
  const resultPath = `${quizPath}/attempts/${attemptId}/result`;
  const { course } = useCourseContent(courseId);

  const [attempt, setAttempt] = useState<AttemptInProgressDto | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [page, setPage] = useState(1);
  // Cờ "xem lại sau" — tiện ích phía người dùng, giữ trên trình duyệt theo từng lượt (sống sót khi tải lại trang)
  const flagsKey = `quiz-flags:${attemptId}`;
  const [flags, setFlags] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(`quiz-flags:${attemptId}`) : null;
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const flaggedCount = flags.size;
  const toggleFlag = (id: string) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(flagsKey, JSON.stringify([...next]));
      } catch {
        // Trình duyệt chặn lưu trữ → cờ chỉ còn trong phiên hiện tại
      }
      return next;
    });
  };
  const offsetRef = useRef(0);
  const dirtyRef = useRef<Set<string>>(new Set());
  const saveTimerRef = useRef<number | undefined>(undefined);
  const submittedRef = useRef(false);

  // Tải lượt; nếu đã nộp (hoặc vừa bị tự nộp vì hết giờ) → sang trang kết quả
  useEffect(() => {
    let active = true;
    fetchQuizAttempt(courseId, quizId, attemptId)
      .then((res) => {
        if (!active) return;
        if (res.mode === "RESULT") {
          router.replace(resultPath);
          return;
        }
        offsetRef.current = new Date(res.attempt.serverTime).getTime() - Date.now();
        setAttempt(res.attempt);
        setAnswers(Object.fromEntries(res.attempt.questions.map((q) => [q.id, q.selectedChoiceIds])));
      })
      .catch((err) => active && setError(formatQuizApiError(err, "Không tải được lượt làm bài")));
    return () => {
      active = false;
    };
  }, [courseId, quizId, attemptId, router, resultPath]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offsetRef.current), 1000);
    return () => window.clearInterval(id);
  }, []);

  const deadline = attempt ? new Date(attempt.deadlineAt).getTime() : 0;
  const remainMs = attempt ? deadline - now : 0;
  const answeredCount = useMemo(() => Object.values(answers).filter((ids) => ids.length > 0).length, [answers]);
  const total = attempt?.questions.length ?? 0;

  // ===================== Lưu nháp =====================
  const flushSave = useCallback(async () => {
    if (!attempt || submittedRef.current) return;
    const ids = [...dirtyRef.current];
    if (!ids.length) return;
    dirtyRef.current.clear();
    const payload: AttemptAnswerInput[] = ids.map((id) => ({ attemptQuestionId: id, choiceIds: answers[id] ?? [] }));
    setSaveState("saving");
    try {
      await saveQuizAnswers(courseId, quizId, attemptId, payload);
      setSaveState("saved");
      setSavedAt(new Date());
    } catch (err) {
      ids.forEach((id) => dirtyRef.current.add(id));
      setSaveState("error");
      const msg = formatQuizApiError(err, "");
      // Lượt đã kết thúc (hết giờ ở máy chủ) → sang kết quả
      if (/kết thúc/i.test(msg)) router.replace(resultPath);
    }
  }, [attempt, answers, courseId, quizId, attemptId, router, resultPath]);

  useEffect(() => {
    if (!dirtyRef.current.size) return;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => void flushSave(), 600);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [answers, flushSave]);

  // ===================== Chặn rời trang khi đang làm bài =====================
  /** Hộp thoại xác nhận dùng chung cho mọi cách rời trang (link, mục lục, nút quay lại) */
  const confirmLeave = useCallback(
    () =>
      confirm({
        title: "Bạn đang làm bài kiểm tra",
        message: (
          <>
            Bài làm <b>chưa được nộp</b>. Nếu rời trang, đồng hồ vẫn tiếp tục đếm; hết giờ hệ thống sẽ tự nộp với các đáp án
            đã lưu. Bạn có thể quay lại trang đề kiểm tra để tiếp tục làm bài bất cứ lúc nào trước hạn.
          </>
        ),
        confirmText: "Rời trang",
        cancelText: "Ở lại làm bài",
        tone: "warning",
      }),
    [confirm],
  );
  const confirmLeaveRef = useRef(confirmLeave);
  useEffect(() => {
    confirmLeaveRef.current = confirmLeave;
  }, [confirmLeave]);

  useEffect(() => {
    if (!attempt) return;
    // 1. Đóng tab / tải lại / gõ URL khác → hộp thoại của trình duyệt
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) e.preventDefault();
    };
    // 2. Bấm vào bất kỳ link nội bộ nào (logo, menu, đường dẫn trên banner) → hỏi trước khi chuyển
    const onClickCapture = (e: MouseEvent) => {
      if (submittedRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      e.preventDefault();
      e.stopPropagation();
      void confirmLeaveRef.current().then((ok) => ok && router.push(url.pathname + url.search + url.hash));
    };
    // 3. Nút Back của trình duyệt → giữ lại trang, hỏi trước; đồng ý thì về trang đề kiểm tra
    let leaving = false;
    window.history.pushState({ quizGuard: true }, "", window.location.href);
    const onPopState = () => {
      if (submittedRef.current || leaving) return;
      window.history.pushState({ quizGuard: true }, "", window.location.href);
      void confirmLeaveRef.current().then((ok) => {
        if (!ok) return;
        leaving = true;
        router.push(quizPath);
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [attempt, router, quizPath]);

  const choose = (q: AttemptQuestionDto, choiceId: string) => {
    setAnswers((prev) => {
      const current = prev[q.id] ?? [];
      let next: string[];
      if (q.snapshot.questionType === "SINGLE") next = current[0] === choiceId ? [] : [choiceId];
      else next = current.includes(choiceId) ? current.filter((id) => id !== choiceId) : [...current, choiceId];
      dirtyRef.current.add(q.id);
      return { ...prev, [q.id]: next };
    });
  };

  // ===================== Nộp bài =====================
  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (!attempt || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      window.clearTimeout(saveTimerRef.current);
      try {
        const payload: AttemptAnswerInput[] = attempt.questions.map((q) => ({ attemptQuestionId: q.id, choiceIds: answers[q.id] ?? [] }));
        const result = await submitQuizAttempt(courseId, quizId, attemptId, payload);
        toast.success(
          auto ? "Hết giờ — bài đã được nộp tự động" : "Nộp bài thành công",
          `Điểm: ${formatScore(result.totalScore)}/${formatScore(result.totalMaxScore)} · đúng ${result.correctCount}/${result.questionCount} câu`,
        );
        router.replace(resultPath);
      } catch (err) {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error("Không nộp được bài", formatQuizApiError(err, "Vui lòng thử lại."));
      }
    },
    [attempt, answers, courseId, quizId, attemptId, router, resultPath],
  );

  // Hết giờ → tự nộp (đáp án đã lưu nháp vẫn được chấm phía máy chủ kể cả khi gửi muộn)
  useEffect(() => {
    if (attempt && remainMs <= 0 && !submittedRef.current) void doSubmit(true);
  }, [attempt, remainMs, doSubmit]);

  const handleSubmitClick = async () => {
    if (!attempt) return;
    const unanswered = total - answeredCount;
    const ok = await confirm({
      title: "Nộp bài?",
      message: (
        <>
          {unanswered > 0 ? (
            <>
              Bạn còn <b>{unanswered}</b> câu chưa trả lời
            </>
          ) : (
            <>Bạn đã trả lời đủ {total} câu</>
          )}
          {flaggedCount > 0 && (
            <>
              , <b>{flaggedCount}</b> câu đang đánh dấu xem lại
            </>
          )}
          .
          <br />
          Sau khi nộp sẽ không sửa được lượt này.
        </>
      ),
      confirmText: "Nộp bài",
      tone: unanswered > 0 || flaggedCount > 0 ? "warning" : "primary",
    });
    if (ok) void doSubmit(false);
  };

  // Phân trang câu hỏi: QUESTIONS_PER_PAGE câu / trang; lưới điều hướng nhảy đúng trang rồi cuộn tới câu
  const pageCount = Math.max(1, Math.ceil(total / QUESTIONS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageQuestions = attempt?.questions.slice((currentPage - 1) * QUESTIONS_PER_PAGE, currentPage * QUESTIONS_PER_PAGE) ?? [];
  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), pageCount));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const scrollTo = (id: string, idx: number) => {
    const target = Math.floor(idx / QUESTIONS_PER_PAGE) + 1;
    if (target !== currentPage) {
      setPage(target);
      window.setTimeout(() => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    } else document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ===================== Banner =====================
  const urgent = remainMs > 0 && remainMs < 5 * 60_000;
  const heroStats: HeroStat[] = attempt
    ? [
        { dot: "sky", label: `Lượt ${attempt.attemptNumber}` },
        { dot: "violet", label: `${total} câu` },
        { dot: "amber", label: `Hạn nộp ${formatDateTime(attempt.deadlineAt)}` },
        { dot: urgent ? "rose" : "emerald", label: `Còn ${formatCountdown(remainMs)}` },
      ]
    : [];

  const saveLabel =
    saveState === "saving" ? (
      <span className="flex items-center gap-1.5 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu…</span>
    ) : saveState === "error" ? (
      <button type="button" onClick={() => void flushSave()} className="flex items-center gap-1.5 text-red-600 hover:underline">
        <CloudOff className="h-3.5 w-3.5" /> Lưu thất bại — bấm để thử lại
      </button>
    ) : savedAt ? (
      <span className="flex items-center gap-1.5 text-emerald-700"><Check className="h-3.5 w-3.5" /> Đã lưu {savedAt.toLocaleTimeString("vi-VN")}</span>
    ) : (
      <span className="text-slate-400">Đáp án được lưu tự động</span>
    );

  return (
    <CourseShell course={course} role="STUDENT" backHref="/student/content" beforeNavigate={confirmLeave}>
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <CourseHero
          eyebrow={{ icon: CheckSquare, primary: course?.name ?? "Khóa học", primaryHref: coursePath, secondary: "Đề kiểm tra", secondaryHref: quizPath }}
          onNavigate={(href) => void confirmLeave().then((ok) => ok && router.push(href))}
          title="Đang làm bài"
          stats={heroStats}
          brandTag="Làm bài"
          status={{ caption: "Thời gian còn lại", label: attempt ? formatCountdown(remainMs) : "—", tone: urgent ? "amber" : "emerald" }}
        />
      </div>

      <main className="page-enter mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : !attempt ? (
          <div className="grid place-items-center rounded-2xl bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
          </div>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-4">
              {urgent && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600" />
                  Sắp hết giờ — còn <b className="font-mono">{formatCountdown(remainMs)}</b>. Hết giờ hệ thống sẽ tự nộp với các đáp án đã lưu.
                </div>
              )}
              {pageQuestions.map((q, offset) => {
                const idx = (currentPage - 1) * QUESTIONS_PER_PAGE + offset;
                const selected = answers[q.id] ?? [];
                const multiple = q.snapshot.questionType === "MULTIPLE";
                const flagged = flags.has(q.id);
                return (
                  <section
                    key={q.id}
                    id={`q-${q.id}`}
                    className={`rounded-2xl border bg-white shadow-xs transition ${flagged ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200/90"}`}
                  >
                    <div className={`flex items-start gap-3 border-b px-5 py-3.5 ${flagged ? "border-amber-100 bg-amber-50/50" : "border-slate-100"}`}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0f6cbf] text-[13px] font-bold text-white">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-slate-900">{q.snapshot.content}</p>
                        <p className="mt-1 text-[12px] text-slate-500">
                          {multiple ? "Chọn tất cả đáp án đúng" : "Chọn một đáp án"} · {formatScore(q.maxScore)} điểm
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {selected.length > 0 && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">Đã trả lời</span>
                        )}
                        {/* Cờ "xem lại sau": lưu trên trình duyệt theo từng lượt, không gửi lên máy chủ */}
                        <button
                          type="button"
                          onClick={() => toggleFlag(q.id)}
                          aria-pressed={flagged}
                          title={flagged ? "Bỏ đánh dấu" : "Đánh dấu câu này để xem lại sau"}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition ${
                            flagged
                              ? "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-700"
                          }`}
                        >
                          <Flag className={`h-3.5 w-3.5 ${flagged ? "fill-current" : ""}`} />
                          {flagged ? "Đã đánh dấu" : "Đánh dấu"}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 px-5 py-4">
                      {q.snapshot.choices.map((c, cIdx) => {
                        const active = selected.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                              active ? "border-[#0f6cbf] bg-blue-50/60 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type={multiple ? "checkbox" : "radio"}
                              name={`q-${q.id}`}
                              checked={active}
                              onChange={() => choose(q, c.id)}
                              onClick={() => {
                                // Radio: bấm lại để bỏ chọn
                                if (!multiple && active) choose(q, c.id);
                              }}
                              className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-[#0f6cbf] focus:ring-[#0f6cbf]"
                            />
                            <span className="w-5 shrink-0 text-[13px] font-semibold text-slate-400">{String.fromCharCode(65 + cIdx)}.</span>
                            <span className="min-w-0 flex-1 whitespace-pre-wrap text-[14px] text-slate-800">{c.content}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {/* Thanh điều hướng trang: trang cuối mới hiện Nộp bài (nộp bất cứ lúc nào vẫn có ở cột phải) */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xs">
                {pageCount > 1 && (
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Trang trước
                  </button>
                )}
                {pageCount > 1 && (
                  <span className="px-2 text-center text-[12.5px] font-medium text-slate-500">
                    Trang {currentPage}/{pageCount} · câu {(currentPage - 1) * QUESTIONS_PER_PAGE + 1}–{Math.min(currentPage * QUESTIONS_PER_PAGE, total)} trên {total}
                  </span>
                )}
                {pageCount > 1 && currentPage < pageCount ? (
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e]"
                  >
                    Trang sau <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitClick}
                    className="flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-6 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e] disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Nộp bài
                  </button>
                )}
              </div>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
              <section className={`rounded-2xl border p-5 shadow-xs ${urgent ? "border-amber-200 bg-amber-50" : "border-slate-200/90 bg-white"}`}>
                <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
                  <Timer className="h-4 w-4 text-[#0f6cbf]" /> Thời gian còn lại
                </p>
                <p className={`mt-1 font-mono text-[34px] font-extrabold tabular-nums leading-none ${urgent ? "text-amber-700" : "text-slate-900"}`}>
                  {formatCountdown(remainMs)}
                </p>
                <p className="mt-2 text-[12px] text-slate-500">Hạn nộp: {formatDateTime(attempt.deadlineAt)}</p>
              </section>

              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-slate-600">Tiến độ</p>
                  <p className="text-[13px] font-bold text-slate-800">
                    {answeredCount}/{total}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#0f6cbf] transition-all" style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-6 gap-1.5">
                  {attempt.questions.map((q, idx) => {
                    const done = (answers[q.id] ?? []).length > 0;
                    const flagged = flags.has(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => scrollTo(q.id, idx)}
                        title={`Câu ${idx + 1}${done ? " — đã trả lời" : ""}${flagged ? " — đánh dấu xem lại" : ""}`}
                        className={`relative h-8 rounded-md text-[12px] font-semibold transition ${
                          done ? "bg-[#0f6cbf] text-white hover:bg-[#0c599e]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        } ${flagged ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                      >
                        {idx + 1}
                        {flagged && (
                          <Flag className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white fill-amber-500 p-0.5 text-amber-600 shadow-sm" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[12px]">
                  <Save className="h-3.5 w-3.5 text-slate-400" /> {saveLabel}
                </p>
              </section>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Nộp bài
              </button>
            </aside>
          </div>
        )}
      </main>
    </CourseShell>
  );
}
