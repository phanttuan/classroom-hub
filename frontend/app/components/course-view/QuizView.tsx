"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  Clock,
  Eye,
  FileText,
  Info,
  ListChecks,
  Loader2,
  Lock,
  Pencil,
  Play,
  Repeat,
  Shuffle,
  Timer,
  Users,
} from "lucide-react";
import type { QuizDto, MyQuizAttemptsResponse, TeacherAttemptListResponse, AttemptSummaryDto } from "@/lib/types/quiz";
import { fetchMyQuizAttempts, fetchQuizAttempts, fetchQuizDetail, startQuizAttempt, formatQuizApiError } from "@/lib/api/quiz-api";
import { formatDateTime, formatScore } from "@/lib/assignment-utils";
import {
  ATTEMPT_BLOCK_TEXT,
  ATTEMPT_GRADING_LABEL,
  ATTEMPT_STATUS_LABEL,
  attemptDuration,
  formatCountdown,
  formatMinutes,
  scoreToneClass,
} from "@/lib/quiz-utils";
import { toast } from "@/app/components/common/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import RichContent from "@/components/content/RichContent";
import CourseShell, { coursePathOf, useCourseContent, type CourseRole } from "./CourseShell";
import CourseHero, { HeroButton, type HeroStat } from "./CourseHero";
import { Badge, Card, InfoRow, PAGE_SIZE, Pagination, StatTile } from "./shared";

interface QuizViewProps {
  courseId: string;
  quizId: string;
  role: CourseRole;
  backHref: string;
}

/** Đếm ngược tới hạn chót của lượt đang dở (hiển thị trên nút "Tiếp tục") */
function Countdown({ deadlineAt, offsetMs }: { deadlineAt: string; offsetMs: number }) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offsetMs), 1000);
    return () => window.clearInterval(id);
  }, [offsetMs]);
  const remain = new Date(deadlineAt).getTime() - now;
  return <span className="font-mono tabular-nums">{formatCountdown(remain)}</span>;
}

export default function QuizView({ courseId, quizId, role, backHref }: QuizViewProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const coursePath = coursePathOf(role, courseId);
  const { course } = useCourseContent(courseId);

  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [mine, setMine] = useState<MyQuizAttemptsResponse | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherAttemptListResponse | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [filter, setFilter] = useState<"all" | "attempted" | "inProgress" | "missing">("all");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  // Lệch đồng hồ giữa máy sinh viên và máy chủ (tính lúc nhận dữ liệu) → đếm ngược chính xác
  const [offsetMs, setOffsetMs] = useState(0);

  const load = useCallback(
    () =>
      Promise.all([
        fetchQuizDetail(courseId, quizId),
        role === "STUDENT" ? fetchMyQuizAttempts(courseId, quizId) : fetchQuizAttempts(courseId, quizId),
      ])
        .then(([q, extra]) => {
          setQuiz(q);
          if (role === "STUDENT") {
            const my = extra as MyQuizAttemptsResponse;
            setMine(my);
            setOffsetMs(new Date(my.serverTime).getTime() - Date.now());
          } else setTeacherData(extra as TeacherAttemptListResponse);
          setError("");
        })
        .catch((err) => setError(formatQuizApiError(err, "Không tải được đề kiểm tra"))),
    [courseId, quizId, role],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const topic = course?.modules.find((m) => m.id === quiz?.moduleId);
  const isArchived = course?.status === "ARCHIVED";

  const attemptHref = (attemptId: string) => `${coursePath}/quizzes/${quizId}/attempts/${attemptId}`;
  const resultHref = (attemptId: string) => (role === "STUDENT" ? `${attemptHref(attemptId)}/result` : attemptHref(attemptId));

  const handleStart = async () => {
    if (!quiz || !mine) return;
    const resuming = Boolean(mine.window.inProgressAttemptId);
    if (!resuming) {
      const ok = await confirm({
        title: "Bắt đầu làm bài?",
        message: (
          <>
            {quiz.durationMinutes ? (
              <>
                Thời gian làm bài <b>{formatMinutes(quiz.durationMinutes)}</b>, hết giờ hệ thống tự nộp.
              </>
            ) : (
              <>Không giới hạn thời gian, cần nộp trước hạn đóng đề.</>
            )}
            <br />
            Đây là lượt <b>{mine.window.attemptsUsed + 1}/{quiz.maxAttempts}</b> của bạn.
          </>
        ),
        confirmText: "Bắt đầu",
        tone: "primary",
      });
      if (!ok) return;
    }
    setStarting(true);
    try {
      const attempt = await startQuizAttempt(courseId, quizId);
      router.push(attemptHref(attempt.id));
    } catch (err) {
      toast.error("Không thể bắt đầu làm bài", formatQuizApiError(err, "Vui lòng tải lại trang và thử lại."));
      void load();
    } finally {
      setStarting(false);
    }
  };

  // ===================== Banner =====================
  const heroStats = (): HeroStat[] => {
    if (!quiz) return [];
    const stats: HeroStat[] = [
      { dot: "amber", label: `Hạn làm ${formatDateTime(quiz.dueAt)}` },
      { dot: "violet", label: `${quiz.questionCount} câu · ${formatScore(quiz.totalMaxScore)} điểm` },
      { dot: "sky", label: quiz.durationMinutes ? formatMinutes(quiz.durationMinutes) : "Không giới hạn giờ" },
      { dot: "slate", label: quiz.maxAttempts > 1 ? `${quiz.maxAttempts} lượt · ${ATTEMPT_GRADING_LABEL[quiz.attemptGrading]}` : "1 lượt" },
    ];
    if (role === "STUDENT" && mine?.gradeScore !== null && mine?.gradeScore !== undefined) {
      stats.push({ icon: Award, highlight: true, label: `Điểm: ${formatScore(mine.gradeScore)}/${formatScore(quiz.totalMaxScore)}` });
    }
    if (role === "TEACHER" && teacherData) {
      stats.push({ dot: "emerald", label: `${teacherData.summary.attempted}/${teacherData.summary.enrolled} đã làm` });
    }
    if (isArchived) stats.push({ dot: "slate", label: "Khóa học đã lưu trữ (chỉ đọc)" });
    return stats;
  };

  const heroStatus = (() => {
    if (!quiz) return undefined;
    const caption = "Trạng thái đề";
    if (quiz.status === "DRAFT") return { caption, label: "Bản nháp", tone: "amber" as const };
    if (quiz.status === "CLOSED") return { caption, label: "Đã đóng", tone: "slate" as const };
    if (new Date(quiz.openAt).getTime() > now) return { caption, label: "Chưa mở", tone: "amber" as const };
    if (new Date(quiz.dueAt).getTime() < now) return { caption, label: "Đã hết hạn", tone: "slate" as const };
    return { caption, label: "Đang mở", tone: "emerald" as const };
  })();

  const heroActions =
    role === "TEACHER" ? (
      <>
        {quiz && quiz.status !== "CLOSED" && !isArchived && (
          <HeroButton variant="solid" href={`/teacher/content/courses/${courseId}/lessons/new?section=${quiz.moduleId}&type=QUIZ&quizId=${quiz.id}`}>
            <Pencil className="h-4 w-4" /> Chỉnh sửa
          </HeroButton>
        )}
        <HeroButton href={`${coursePath}#module-section-${quiz?.moduleId ?? ""}`}>
          <ArrowLeft className="h-4 w-4" /> Về trang khóa học
        </HeroButton>
      </>
    ) : (
      <HeroButton href={`${coursePath}#module-section-${quiz?.moduleId ?? ""}`}>
        <ArrowLeft className="h-4 w-4" /> Về trang khóa học
      </HeroButton>
    );

  // ===================== Sinh viên =====================
  const renderAttemptRow = (a: AttemptSummaryDto) => {
    const st = ATTEMPT_STATUS_LABEL[a.status];
    return (
      <tr key={a.id} className="align-middle">
        <td className="px-5 py-3 text-center font-semibold text-slate-800">{a.attemptNumber}</td>
        <td className="px-3 py-3 text-center">
          <Badge tone={st.tone} fixed>
            {st.label}
          </Badge>
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-center tabular-nums text-slate-700">{formatDateTime(a.startedAt)}</td>
        <td className="whitespace-nowrap px-3 py-3 text-center tabular-nums text-slate-700">{a.submittedAt ? formatDateTime(a.submittedAt) : "—"}</td>
        <td className="px-3 py-3 text-center text-slate-700">{attemptDuration(a)}</td>
        <td className={`px-3 py-3 text-center font-bold ${scoreToneClass(a.totalScore, quiz?.totalMaxScore)}`}>
          {a.totalScore !== null ? `${formatScore(a.totalScore)}/${formatScore(quiz?.totalMaxScore)}` : "—"}
        </td>
        <td className="px-5 py-3 text-center">
          {a.status === "IN_PROGRESS" ? (
            <button
              type="button"
              onClick={() => router.push(attemptHref(a.id))}
              className="inline-flex h-9 w-[124px] items-center justify-center gap-1.5 rounded-lg bg-[#0f6cbf] text-[12.5px] font-semibold text-white hover:bg-[#0c599e]"
            >
              <Play className="h-3.5 w-3.5" /> Tiếp tục
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push(resultHref(a.id))}
              className="inline-flex h-9 w-[124px] items-center justify-center gap-1.5 rounded-lg border border-[#0f6cbf]/40 bg-white text-[12.5px] font-semibold text-[#0f6cbf] hover:bg-blue-50"
            >
              <Eye className="h-3.5 w-3.5" /> Xem kết quả
            </button>
          )}
        </td>
      </tr>
    );
  };

  const renderStudentActions = () => {
    if (!quiz || !mine) return null;
    const { window } = mine;
    if (window.inProgressAttemptId) {
      return (
        <div className="flex flex-col items-center gap-3">
          {mine.inProgressDeadlineAt && (
            <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13.5px] text-amber-900">
              <Timer className="h-4 w-4 text-amber-600" />
              Bạn đang có một lượt dở — còn <Countdown deadlineAt={mine.inProgressDeadlineAt} offsetMs={offsetMs} />
            </p>
          )}
          <button
            type="button"
            disabled={starting}
            onClick={handleStart}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f6cbf] px-6 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e] disabled:opacity-60"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Tiếp tục làm bài
          </button>
        </div>
      );
    }
    if (!window.canStart) {
      return (
        <div className="flex items-start justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[13.5px] text-slate-700">
          <Lock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-500" />
          <span>{window.reason ? ATTEMPT_BLOCK_TEXT[window.reason] : "Hiện không thể làm bài."}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={starting}
          onClick={handleStart}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f6cbf] px-6 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e] disabled:opacity-60"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {window.attemptsUsed > 0 ? "Làm lại" : "Bắt đầu làm bài"}
        </button>
        <p className="text-[12.5px] text-slate-500">
          Còn <b>{window.attemptsLeft}</b>/{quiz.maxAttempts} lượt
          {quiz.durationMinutes ? ` · ${formatMinutes(quiz.durationMinutes)} mỗi lượt` : ""}
          {window.isPastDue ? "" : ` · hạn ${formatDateTime(quiz.dueAt)}`}
        </p>
      </div>
    );
  };

  const renderStudentBody = () => {
    if (!quiz || !mine) return null;
    return (
      <Card title="Lượt làm bài của bạn" icon={ListChecks}>
        {mine.attempts.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13.5px] text-slate-500">Bạn chưa làm bài kiểm tra này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 text-center font-semibold">Lượt</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Trạng thái</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Bắt đầu</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Nộp lúc</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Thời gian làm</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Điểm</th>
                  <th className="px-5 py-2.5 text-center font-semibold">Xem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">{mine.attempts.map(renderAttemptRow)}</tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-4">{renderStudentActions()}</div>
      </Card>
    );
  };

  // ===================== Giáo viên =====================
  const renderTeacherBody = () => {
    if (!quiz || !teacherData) return null;
    const { summary, rows } = teacherData;
    const filters: { key: typeof filter; label: string; count: number }[] = [
      { key: "all", label: "Tất cả", count: rows.length },
      { key: "attempted", label: "Đã làm", count: summary.attempted },
      { key: "inProgress", label: "Đang làm", count: summary.inProgress },
      { key: "missing", label: "Chưa làm", count: summary.notAttempted },
    ];
    const visible = rows.filter((r) => {
      if (filter === "attempted") return r.attemptCount > 0;
      if (filter === "inProgress") return r.inProgress;
      if (filter === "missing") return r.attemptCount === 0;
      return true;
    });
    const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    const current = Math.min(page, pageCount);
    const paged = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    const max = formatScore(quiz.totalMaxScore);

    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Sinh viên" value={summary.enrolled} tone="slate" />
          <StatTile label="Đã làm" value={summary.attempted} tone="emerald" />
          <StatTile label="Đang làm" value={summary.inProgress} tone="amber" />
          <StatTile label="Chưa làm" value={summary.notAttempted} tone="red" />
          <StatTile label="Điểm TB" value={summary.averageScore !== null ? formatScore(summary.averageScore) : "—"} tone="violet" />
        </div>

        <Card title="Kết quả theo sinh viên" icon={Users} centerTitle>
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13.5px] text-slate-500">Khóa học chưa có sinh viên nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2.5">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setFilter(f.key);
                      setPage(1);
                    }}
                    className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition ${
                      filter === f.key ? "bg-[#0f6cbf] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label} <span className={filter === f.key ? "text-blue-100" : "text-slate-400"}>{f.count}</span>
                  </button>
                ))}
              </div>
              <table className="w-full min-w-[900px] text-left text-[13px]">
                <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Sinh viên</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Trạng thái</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Số lượt</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Cao nhất</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Gần nhất</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Điểm sổ</th>
                    <th className="px-5 py-2.5 text-center font-semibold">Các lượt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-[13px] text-slate-400">
                        Không có sinh viên nào trong bộ lọc này.
                      </td>
                    </tr>
                  )}
                  {paged.map((r) => (
                    <tr key={r.student.id} className={`align-middle ${r.inProgress ? "bg-amber-50/40" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element -- avatar từ Cloudinary / ảnh tĩnh */}
                          <img src={r.student.avatarUrl || "/images/student.webp"} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800">{r.student.fullName}</span>
                            <span className="block truncate text-[11.5px] text-slate-500">{r.student.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {r.inProgress ? (
                          <Badge tone="warning" fixed>
                            <Clock className="h-3.5 w-3.5" /> Đang làm
                          </Badge>
                        ) : r.attemptCount > 0 ? (
                          <Badge tone="success" fixed>
                            <CheckSquare className="h-3.5 w-3.5" /> Đã làm
                          </Badge>
                        ) : (
                          <Badge tone={teacherData.window.isPastDue ? "danger" : "neutral"} fixed>
                            {teacherData.window.isPastDue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                            {teacherData.window.isPastDue ? "Chưa làm (quá hạn)" : "Chưa làm"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">
                        {r.attemptCount}/{quiz.maxAttempts}
                      </td>
                      <td className={`px-3 py-3 text-center font-semibold ${scoreToneClass(r.bestScore, quiz.totalMaxScore)}`}>{r.bestScore !== null ? `${formatScore(r.bestScore)}/${max}` : "—"}</td>
                      <td className={`px-3 py-3 text-center font-semibold ${scoreToneClass(r.latestScore, quiz.totalMaxScore)}`}>{r.latestScore !== null ? `${formatScore(r.latestScore)}/${max}` : "—"}</td>
                      <td className={`px-3 py-3 text-center font-bold ${scoreToneClass(r.gradeScore, quiz.totalMaxScore)}`}>
                        {r.gradeScore !== null ? `${formatScore(r.gradeScore)}/${max}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {r.attempts.length ? (
                          <div className="inline-flex flex-wrap justify-center gap-1">
                            {r.attempts.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                disabled={a.status === "IN_PROGRESS"}
                                onClick={() => router.push(resultHref(a.id))}
                                title={a.status === "IN_PROGRESS" ? "Đang làm" : `Lượt ${a.attemptNumber}: ${formatScore(a.totalScore)}/${max}`}
                                className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border px-2 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                                  a.status === "IN_PROGRESS"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-[#0f6cbf]/40 bg-white text-[#0f6cbf] hover:bg-blue-50"
                                }`}
                              >
                                <Eye className="h-3.5 w-3.5" /> {a.attemptNumber}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visible.length > PAGE_SIZE && (
                <Pagination
                  page={current}
                  pageCount={pageCount}
                  from={(current - 1) * PAGE_SIZE + 1}
                  to={Math.min(current * PAGE_SIZE, visible.length)}
                  total={visible.length}
                  onChange={setPage}
                />
              )}
            </div>
          )}
        </Card>
      </>
    );
  };

  return (
    <CourseShell course={course} role={role} backHref={backHref} activeModuleId={quiz?.moduleId}>
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <CourseHero
          eyebrow={{
            icon: CheckSquare,
            primary: course?.name ?? "Khóa học",
            primaryHref: coursePath,
            secondary: topic?.title,
            secondaryHref: topic ? `${coursePath}#module-section-${topic.id}` : undefined,
          }}
          title={quiz?.title ?? "Đề kiểm tra"}
          stats={heroStats()}
          brandTag="Đề kiểm tra"
          status={heroStatus}
          actions={heroActions}
        />
      </div>

      <main className="page-enter mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : !quiz ? (
          <div className="grid place-items-center rounded-2xl bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              <Card title="Hướng dẫn làm bài" icon={FileText}>
                {quiz.instructions ? (
                  <RichContent html={quiz.instructions} className="px-5 py-4 !text-[14.5px] text-slate-700" />
                ) : (
                  <p className="px-5 py-6 text-[13.5px] italic text-slate-400">Giáo viên chưa thêm hướng dẫn cho đề này.</p>
                )}
              </Card>
              {role === "STUDENT" ? renderStudentBody() : renderTeacherBody()}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Card title="Thông tin đề" icon={Info}>
                <div className="py-2">
                  <InfoRow icon={CalendarDays} label="Mở đề" value={formatDateTime(quiz.openAt)} />
                  <InfoRow icon={CalendarClock} label="Hạn đóng" value={formatDateTime(quiz.dueAt)} />
                  <InfoRow icon={Timer} label="Thời lượng" value={formatMinutes(quiz.durationMinutes)} />
                  <InfoRow icon={Repeat} label="Số lượt" value={`${quiz.maxAttempts} lượt`} />
                  {quiz.maxAttempts > 1 && <InfoRow icon={Award} label="Cách tính điểm" value={ATTEMPT_GRADING_LABEL[quiz.attemptGrading]} />}
                  <InfoRow icon={ListChecks} label="Câu hỏi" value={`${quiz.questionCount} câu · ${formatScore(quiz.totalMaxScore)} điểm`} />
                  {/* Cài đặt chống chép bài — chỉ có ý nghĩa với giáo viên */}
                  {role === "TEACHER" && (
                    <InfoRow
                      icon={Shuffle}
                      label="Trộn đề"
                      value={
                        quiz.shuffleQuestions || quiz.shuffleChoices
                          ? [quiz.shuffleQuestions && "câu hỏi", quiz.shuffleChoices && "đáp án"].filter(Boolean).join(" và ")
                          : "Không"
                      }
                    />
                  )}
                  <InfoRow
                    icon={Eye}
                    label="Đáp án"
                    value={quiz.showAnswersAfterSubmit ? <span className="text-emerald-700">Hiện sau khi nộp</span> : "Không hiện đáp án"}
                  />
                  <InfoRow
                    icon={Award}
                    label="Sổ điểm"
                    value={quiz.scoringEnabled ? "Có tính vào sổ điểm" : <span className="text-slate-600">Không tính điểm <span className="whitespace-nowrap">(luyện tập)</span></span>}
                  />
                </div>
              </Card>
              {role === "TEACHER" && quiz.questions && quiz.questions.length > 0 && (
                <Card title={`Câu hỏi trong đề (${quiz.questions.length})`} icon={ListChecks}>
                  <ol className="max-h-[40vh] divide-y divide-slate-100 overflow-y-auto">
                    {quiz.questions.map((q) => (
                      <li key={q.id} className="flex gap-2.5 px-4 py-2.5 text-[13px]">
                        <span className="w-5 shrink-0 text-right text-[11.5px] font-semibold text-slate-400">{q.orderIndex}</span>
                        <span className="min-w-0 flex-1 truncate text-slate-700" title={q.questionSnapshot.content}>
                          {q.questionSnapshot.content}
                        </span>
                        <span className="shrink-0 text-[11.5px] font-semibold text-slate-500">{formatScore(q.maxScore)} đ</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </aside>
          </div>
        )}
      </main>
    </CourseShell>
  );
}
