"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  ListChecks,
  Loader2,
  Play,
  X,
  XCircle,
} from "lucide-react";
import type { AttemptResultDto } from "@/lib/types/quiz";
import { fetchMyQuizAttempts, fetchQuizAttemptResult, formatQuizApiError, startQuizAttempt } from "@/lib/api/quiz-api";
import type { AttemptWindowDto } from "@/lib/types/quiz";
import { toast } from "@/app/components/common/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

import { formatDateTime, formatScore } from "@/lib/assignment-utils";
import { attemptDuration, scoreRatio } from "@/lib/quiz-utils";
import CourseShell, { coursePathOf, useCourseContent, type CourseRole } from "./CourseShell";
import CourseHero, { HeroButton, type HeroStat } from "./CourseHero";
import { Card } from "./shared";

/** Số câu hỏi mỗi trang — cùng giá trị với trang làm bài */
const QUESTIONS_PER_PAGE = 10;

interface QuizAttemptResultProps {
  courseId: string;
  quizId: string;
  attemptId: string;
  role: CourseRole;
  backHref: string;
}

/** Kết quả một lượt: sinh viên xem lại bài của mình; giáo viên xem bài của sinh viên (luôn thấy đáp án đúng) */
export default function QuizAttemptResult({ courseId, quizId, attemptId, role, backHref }: QuizAttemptResultProps) {
  const coursePath = coursePathOf(role, courseId);
  const quizPath = `${coursePath}/quizzes/${quizId}`;
  const { course } = useCourseContent(courseId);
  const [result, setResult] = useState<AttemptResultDto | null>(null);
  const [error, setError] = useState("");
  // Phân trang như trang làm bài; lưới câu hỏi ở cột phải tô xanh / đỏ theo đúng / sai để nhảy nhanh
  const [page, setPage] = useState(1);
  const questionCount = result?.questions.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(questionCount / QUESTIONS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageQuestions = result?.questions.slice((currentPage - 1) * QUESTIONS_PER_PAGE, currentPage * QUESTIONS_PER_PAGE) ?? [];
  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), pageCount));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const jumpTo = (id: string, idx: number) => {
    const target = Math.floor(idx / QUESTIONS_PER_PAGE) + 1;
    const scroll = () => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target !== currentPage) {
      setPage(target);
      window.setTimeout(scroll, 50);
    } else scroll();
  };
  // Sinh viên: cửa sổ làm bài để hiện nút "Làm lại" ngay trên trang kết quả khi còn lượt
  const [window_, setWindow] = useState<AttemptWindowDto | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const router = useRouter();
  const confirm = useConfirm();

  useEffect(() => {
    let active = true;
    fetchQuizAttemptResult(courseId, quizId, attemptId)
      .then((r) => active && setResult(r))
      .catch((err) => active && setError(formatQuizApiError(err, "Không tải được kết quả")));
    if (role === "STUDENT") {
      fetchMyQuizAttempts(courseId, quizId)
        .then((m) => {
          if (!active) return;
          setWindow(m.window);
          setMaxAttempts(m.window.attemptsUsed + m.window.attemptsLeft);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [courseId, quizId, attemptId, role]);

  const handleRetry = async () => {
    if (!window_) return;
    const ok = await confirm({
      title: "Làm lại bài kiểm tra?",
      message: (
        <>
          Đây là lượt <b>{window_.attemptsUsed + 1}{maxAttempts ? `/${maxAttempts}` : ""}</b> của bạn.
          <br />
          Điểm ghi sổ tính theo cách giáo viên đã chọn cho đề.
        </>
      ),
      confirmText: "Bắt đầu",
      tone: "primary",
    });
    if (!ok) return;
    setStarting(true);
    try {
      const attempt = await startQuizAttempt(courseId, quizId);
      router.push(`${quizPath}/attempts/${attempt.id}`);
    } catch (err) {
      toast.error("Không thể bắt đầu lượt mới", formatQuizApiError(err, "Vui lòng tải lại trang."));
    } finally {
      setStarting(false);
    }
  };

  const ratio = result ? scoreRatio(result.totalScore, result.totalMaxScore) : null;
  const tone = ratio === null ? "slate" : ratio >= 0.8 ? "emerald" : ratio >= 0.5 ? "amber" : "red";
  const toneText = { slate: "text-slate-700", emerald: "text-emerald-700", amber: "text-amber-700", red: "text-red-600" }[tone];
  const toneBar = { slate: "bg-slate-400", emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" }[tone];

  const heroStats: HeroStat[] = result
    ? [
        { dot: "sky", label: `Lượt ${result.attemptNumber}` },
        { dot: "amber", label: `Nộp lúc ${formatDateTime(result.submittedAt)}` },
        { dot: "violet", label: `Làm trong ${attemptDuration(result)}` },
        { icon: Award, highlight: true, label: `${formatScore(result.totalScore)}/${formatScore(result.totalMaxScore)} điểm` },
      ]
    : [];

  return (
    <CourseShell course={course} role={role} backHref={backHref}>
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <CourseHero
          eyebrow={{ icon: CheckSquare, primary: course?.name ?? "Khóa học", primaryHref: coursePath, secondary: "Đề kiểm tra", secondaryHref: quizPath }}
          title={result?.student ? `Bài làm của ${result.student.fullName}` : "Kết quả làm bài"}
          stats={heroStats}
          brandTag="Kết quả"
          status={{ caption: "Trạng thái", label: result ? `Đúng ${result.correctCount}/${result.questionCount} câu` : "—", tone: "sky" }}
          actions={
            <HeroButton href={quizPath}>
              <ArrowLeft className="h-4 w-4" /> {role === "TEACHER" ? "Về bảng kết quả" : "Về trang đề kiểm tra"}
            </HeroButton>
          }
        />
      </div>

      <main className="page-enter mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : !result ? (
          <div className="grid place-items-center rounded-2xl bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
          </div>
        ) : (
          <div className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] ${result.answersRevealed ? "items-start" : "lg:items-stretch"}`}>
            <div className={`min-w-0 space-y-4 ${result.answersRevealed ? "" : "h-full"}`}>
              {!result.answersRevealed && (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-xs">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                    <EyeOff className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-[16px] font-bold text-slate-900">Chi tiết bài làm được ẩn</p>
                  <p className="mt-1 max-w-md text-[13.5px] text-slate-500">
                    Giáo viên không cho xem lại đáp án của đề này, nên chỉ hiển thị điểm số và số câu đúng. Câu hỏi và lựa chọn bạn đã
                    chọn không được hiển thị.
                  </p>
                </div>
              )}
              {pageQuestions.map((q, offset) => {
                const idx = (currentPage - 1) * QUESTIONS_PER_PAGE + offset;
                const correctSet = new Set(q.correctChoiceIds ?? []);
                const selected = new Set(q.selectedChoiceIds);
                return (
                  <section
                    key={q.id}
                    id={`q-${q.id}`}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-xs ${q.isCorrect ? "border-emerald-200" : "border-red-200"}`}
                  >
                    <div className={`flex items-start gap-3 border-b px-5 py-3.5 ${q.isCorrect ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/50"}`}>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white ${q.isCorrect ? "bg-emerald-500" : "bg-red-500"}`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-slate-900">{q.snapshot.content}</p>
                        <p className="mt-1 text-[12px] text-slate-500">{q.snapshot.questionType === "MULTIPLE" ? "Nhiều đáp án" : "Một đáp án"}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${q.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {q.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {q.isCorrect ? "Đúng" : "Sai"} · {formatScore(q.awardedScore)}/{formatScore(q.maxScore)}
                      </span>
                    </div>
                    <div className="space-y-2 px-5 py-4">
                      {q.snapshot.choices.map((c, cIdx) => {
                        const isSelected = selected.has(c.id);
                        const isCorrect = result.answersRevealed ? correctSet.has(c.id) : null;
                        const cls =
                          isCorrect === true
                            ? "border-emerald-300 bg-emerald-50"
                            : isSelected && isCorrect === false
                              ? "border-red-300 bg-red-50"
                              : isSelected
                                ? "border-[#0f6cbf] bg-blue-50/60"
                                : "border-slate-200";
                        return (
                          <div key={c.id} className={`flex items-start gap-3 rounded-xl border px-4 py-2.5 ${cls}`}>
                            <span className="w-5 shrink-0 text-[13px] font-semibold text-slate-400">{String.fromCharCode(65 + cIdx)}.</span>
                            <span className="min-w-0 flex-1 whitespace-pre-wrap text-[14px] text-slate-800">{c.content}</span>
                            <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold">
                              {isSelected && <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[#0f6cbf] ring-1 ring-blue-200">Bạn chọn</span>}
                              {isCorrect === true && (
                                <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                  <Check className="h-3.5 w-3.5" /> Đúng
                                </span>
                              )}
                              {isSelected && isCorrect === false && (
                                <span className="inline-flex items-center gap-0.5 text-red-600">
                                  <X className="h-3.5 w-3.5" /> Sai
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                      {q.selectedChoiceIds.length === 0 && <p className="text-[12.5px] italic text-slate-400">Không trả lời câu này.</p>}
                    </div>
                  </section>
                );
              })}

              {pageCount > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Trang trước
                  </button>
                  <span className="px-2 text-center text-[12.5px] font-medium text-slate-500">
                    Trang {currentPage}/{pageCount} · câu {(currentPage - 1) * QUESTIONS_PER_PAGE + 1}–
                    {Math.min(currentPage * QUESTIONS_PER_PAGE, result.questions.length)} trên {result.questions.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= pageCount}
                    onClick={() => goToPage(currentPage + 1)}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trang sau <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <aside className={`space-y-4 ${result.answersRevealed ? "lg:sticky lg:top-20 lg:self-start" : ""}`}>
              <Card title="Tổng kết" icon={Award}>
                <div className="px-5 py-5 text-center">
                  <p className={`text-[40px] font-extrabold leading-none ${toneText}`}>
                    {formatScore(result.totalScore)}
                    <span className="text-[18px] font-semibold text-slate-400"> / {formatScore(result.totalMaxScore)}</span>
                  </p>
                  <div className="mx-auto mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${toneBar}`} style={{ width: `${(ratio ?? 0) * 100}%` }} />
                  </div>
                  <p className="mt-3 text-[13px] text-slate-600">
                    Đúng <b className="text-slate-800">{result.correctCount}</b>/{result.questionCount} câu
                    {ratio !== null && ` · ${Math.round(ratio * 100)}%`}
                  </p>
                </div>
                <dl className="divide-y divide-slate-100 border-t border-slate-100 text-[13px]">
                  <div className="flex justify-between gap-3 px-5 py-2.5">
                    <dt className="flex items-center gap-1.5 text-slate-500"><ListChecks className="h-3.5 w-3.5" /> Lượt</dt>
                    <dd className="font-semibold text-slate-800">{result.attemptNumber}</dd>
                  </div>
                  <div className="flex justify-between gap-3 px-5 py-2.5">
                    <dt className="flex items-center gap-1.5 text-slate-500"><Clock className="h-3.5 w-3.5" /> Bắt đầu</dt>
                    <dd className="font-semibold tabular-nums text-slate-800">{formatDateTime(result.startedAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 px-5 py-2.5">
                    <dt className="flex items-center gap-1.5 text-slate-500"><Clock className="h-3.5 w-3.5" /> Nộp lúc</dt>
                    <dd className="font-semibold tabular-nums text-slate-800">{formatDateTime(result.submittedAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 px-5 py-2.5">
                    <dt className="text-slate-500">Thời gian làm</dt>
                    <dd className="font-semibold text-slate-800">{attemptDuration(result)}</dd>
                  </div>
                </dl>
                {/* Lưới câu hỏi: xanh = đúng, đỏ = sai; bấm để nhảy tới câu (tự đổi trang) — chỉ khi được xem lại bài */}
                {result.answersRevealed && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="grid grid-cols-6 gap-1.5">
                    {result.questions.map((q, idx) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => jumpTo(q.id, idx)}
                        title={`Câu ${idx + 1} — ${q.isCorrect ? "đúng" : "sai"}`}
                        className={`h-8 rounded-md text-[12px] font-semibold text-white transition ${
                          q.isCorrect ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2.5 flex items-center justify-center gap-3 text-[11.5px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Đúng</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Sai</span>
                  </p>
                </div>
                )}
                {role === "STUDENT" && window_ && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    {window_.canStart ? (
                      <>
                        <button
                          type="button"
                          disabled={starting}
                          onClick={handleRetry}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
                        >
                          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Làm lại
                        </button>
                        <p className="mt-2 text-center text-[12px] text-slate-500">
                          Còn <b>{window_.attemptsLeft}</b>{maxAttempts ? `/${maxAttempts}` : ""} lượt
                        </p>
                      </>
                    ) : (
                      <p className="text-center text-[12.5px] text-slate-500">
                        {window_.reason === "NO_ATTEMPTS_LEFT" ? "Bạn đã dùng hết số lượt làm bài." : "Hiện không thể làm lại bài này."}
                      </p>
                    )}
                  </div>
                )}
              </Card>
              {result.student && (
                <Card title="Sinh viên" icon={CheckSquare}>
                  <div className="flex items-center gap-3 px-5 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element -- avatar từ Cloudinary / ảnh tĩnh */}
                    <img src={result.student.avatarUrl || "/images/student.webp"} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200" />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-slate-800">{result.student.fullName}</span>
                      <span className="block truncate text-[12px] text-slate-500">{result.student.email}</span>
                    </span>
                  </div>
                </Card>
              )}
            </aside>
          </div>
        )}
      </main>
    </CourseShell>
  );
}
