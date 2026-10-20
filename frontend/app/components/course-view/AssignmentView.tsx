"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  FileUp,
  FolderDown,
  Info,
  MessageSquareText,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  PencilLine,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import type { AssignmentDto } from "@/lib/types/assignment";
import type {
  MySubmissionResponse,
  SubmissionDto,
  SubmissionFileDto,
  TeacherSubmissionListResponse,
} from "@/lib/types/submission";
import { fetchAssignmentDetail } from "@/lib/api/assignment-api";
import {
  downloadAllSubmissions,
  fetchAssignmentSubmissions,
  fetchMySubmission,
  removeSubmission,
} from "@/lib/api/submission-api";
import { triggerResourceDownload } from "@/lib/api/resource-api";
import {
  BLOCK_REASON_TEXT,
  formatDateTime,
  formatDateTimeLong,
  formatScore,
  submissionStateLabel,
  submissionTypesLabel,
  timeRemainingLabel,
  type SubmissionStateTone,
} from "@/lib/assignment-utils";
import { fileTypeLabel, formatFileSize } from "@/lib/lesson-types";
import { toast } from "@/app/components/common/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import RichContent from "@/components/content/RichContent";
import DocumentPreview from "@/components/resource/DocumentPreview";
import Modal from "@/app/teacher/components/Modal";
import CourseShell, { coursePathOf, useCourseContent, type CourseRole } from "./CourseShell";
import CourseHero, { HeroButton, type HeroStat } from "./CourseHero";

interface AssignmentViewProps {
  courseId: string;
  assignmentId: string;
  role: CourseRole;
  backHref: string;
}

const TONE_BADGE: Record<SubmissionStateTone, string> = {
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
};

const REMAIN_TONE: Record<"neutral" | "success" | "warning" | "danger", string> = {
  neutral: "text-slate-800",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-600",
};

function Card({
  title,
  icon: Icon,
  children,
  className = "",
  aside,
  centerTitle,
}: {
  title?: string;
  icon?: typeof FileText;
  children: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
  /** Căn giữa tiêu đề (khi thẻ không có nút ở góc phải) */
  centerTitle?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/90 bg-white shadow-xs ${className}`}>
      {title && (
        <h2 className={`flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 text-[14px] font-bold text-slate-800 ${centerTitle ? "justify-center" : ""}`}>
          {Icon && <Icon className="h-4 w-4 text-[#0f6cbf]" />}
          {title}
          {aside && <span className="ml-auto">{aside}</span>}
        </h2>
      )}
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span className="w-28 shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 break-words text-[13.5px] font-medium text-slate-800">{value}</span>
    </div>
  );
}

/** Một dòng trong bảng trạng thái nộp bài (giống "Submission status" của Moodle) */
function StatusRow({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`grid gap-1 px-5 py-3 sm:grid-cols-[200px_1fr] sm:gap-6 ${highlight ? "bg-amber-50/60" : ""}`}>
      <span className="text-[13px] font-semibold text-slate-600">{label}</span>
      <div className="min-w-0 text-[13.5px] text-slate-800">{children}</div>
    </div>
  );
}

/** `fixed`: cùng chiều rộng để các dòng trong bảng thẳng hàng */
function StateBadge({ submission, isPastDue, fixed }: { submission: SubmissionDto | null | undefined; isPastDue?: boolean; fixed?: boolean }) {
  const s = submissionStateLabel(submission, { isPastDue: Boolean(isPastDue) });
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-semibold ${TONE_BADGE[s.tone]} ${
        fixed ? "w-[148px] justify-center" : ""
      }`}
    >
      {s.tone === "success" || s.tone === "info" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : s.tone === "warning" ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : s.tone === "danger" ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        <Clock className="h-3.5 w-3.5" />
      )}
      {s.label}
    </span>
  );
}

/** Dòng tệp đính kèm của bài nộp: xem trực tiếp / tải xuống */
function SubmissionFileRow({ file, onPreview }: { file: SubmissionFileDto; onPreview: (f: SubmissionFileDto) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#0f6cbf] ring-1 ring-slate-200">
        <FileText className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onPreview(file)}
          className="block max-w-full truncate text-left text-[13.5px] font-semibold text-[#0f6cbf] hover:underline"
        >
          {file.fileName}
        </button>
        <span className="text-[11.5px] text-slate-500">
          {fileTypeLabel(file.fileName, file.mimeType)} · {formatFileSize(file.fileSizeBytes)}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onPreview(file)}
        title="Xem trực tiếp"
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          await triggerResourceDownload(file.id, file.fileName).catch(() => toast.error("Không tải được tệp", "Vui lòng thử lại sau ít phút."));
          setBusy(false);
        }}
        title="Tải xuống"
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Bài làm văn bản: thu gọn, bấm để xem đầy đủ */
function OnlineTextPreview({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className={`rounded-xl border border-slate-200 bg-white px-4 py-3 ${expanded ? "" : "max-h-40 overflow-hidden"}`}>
        <RichContent html={html} className="!text-[13.5px]" />
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1.5 text-[12.5px] font-semibold text-[#0f6cbf] hover:underline"
      >
        {expanded ? "Thu gọn" : "Xem đầy đủ"}
      </button>
    </div>
  );
}

/** Số dòng mỗi trang trong bảng bài nộp */
const PAGE_SIZE = 10;

/** Các số trang hiển thị: luôn có đầu / cuối, quanh trang hiện tại, chỗ bỏ qua là "…" */
function pageNumbers(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const btn = "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[12.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
      <p className="text-[12.5px] text-slate-500">
        Hiển thị <b className="text-slate-700">{from}–{to}</b> trong <b className="text-slate-700">{total}</b> sinh viên
      </p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước" className={`${btn} text-slate-600 hover:bg-slate-100`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageNumbers(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${btn} ${p === page ? "bg-[#0f6cbf] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Trang sau" className={`${btn} text-slate-600 hover:bg-slate-100`}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "amber" | "red" | "sky" }) {
  const cls = {
    slate: "bg-slate-50 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    sky: "bg-sky-50 text-sky-700",
  }[tone];
  return (
    <div className={`rounded-xl px-4 py-3 text-center ${cls}`}>
      <p className="text-[22px] font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[12px] font-medium opacity-80">{label}</p>
    </div>
  );
}

export default function AssignmentView({ courseId, assignmentId, role, backHref }: AssignmentViewProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const coursePath = coursePathOf(role, courseId);
  const { course } = useCourseContent(courseId);

  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [mine, setMine] = useState<MySubmissionResponse | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherSubmissionListResponse | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const [previewFile, setPreviewFile] = useState<SubmissionFileDto | null>(null);
  const [viewing, setViewing] = useState<SubmissionDto | null>(null);
  // Bộ lọc bảng bài nộp của giáo viên + trạng thái tải gói .zip
  const [filter, setFilter] = useState<"all" | "ungraded" | "graded" | "late" | "missing">("all");
  // Phân trang bảng bài nộp (phía client — danh sách lớp thường vài chục sinh viên)
  const [page, setPage] = useState(1);
  const [zipping, setZipping] = useState(false);

  const handleDownloadAll = async () => {
    if (!assignment) return;
    setZipping(true);
    try {
      const total = await downloadAllSubmissions(courseId, assignmentId);
      toast.success("Đang tải gói bài nộp", `${total} tệp đính kèm — tệp không tải được (nếu có) ghi trong README.txt`);
    } catch (err) {
      toast.error("Không tải được gói bài nộp", (err as Error)?.message || "Vui lòng thử lại sau ít phút.");
    } finally {
      setZipping(false);
    }
  };
  // Đồng hồ cập nhật "thời gian còn lại" mỗi phút
  const [now, setNow] = useState(() => Date.now());

  // Tải bài tập + bài nộp (sinh viên) / danh sách bài nộp (giáo viên); dùng lại sau khi loại bỏ bài nộp
  const load = useCallback(
    () =>
      Promise.all([
        fetchAssignmentDetail(courseId, assignmentId),
        role === "STUDENT" ? fetchMySubmission(courseId, assignmentId) : fetchAssignmentSubmissions(courseId, assignmentId),
      ])
        .then(([a, extra]) => {
          setAssignment(a);
          if (role === "STUDENT") setMine(extra as MySubmissionResponse);
          else setTeacherData(extra as TeacherSubmissionListResponse);
          setError("");
        })
        .catch((err) => setError((err as Error)?.message || "Không tải được bài tập")),
    [courseId, assignmentId, role],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const topic = course?.modules.find((m) => m.id === assignment?.moduleId);
  const isArchived = course?.status === "ARCHIVED";
  const submission = mine?.submission ?? null;
  const window_ = role === "STUDENT" ? mine?.window : teacherData?.window;
  const remaining = useMemo(
    () => (assignment ? timeRemainingLabel(assignment.dueAt, submission, now) : null),
    [assignment, submission, now],
  );

  const submitHref = `${coursePath}/assignments/${assignmentId}/submit`;

  const handleRemove = async () => {
    const ok = await confirm({
      title: "Loại bỏ bài nộp?",
      message: (
        <>
          Bài làm văn bản và tệp đính kèm sẽ bị xóa, bài tập trở về trạng thái <b>chưa nộp</b>.
          {window_?.isPastDue && assignment?.allowLateSubmission && (
            <>
              {" "}
              Đã quá hạn nộp — nếu nộp lại, bài sẽ bị đánh dấu <b>Nộp trễ</b>.
            </>
          )}
        </>
      ),
      confirmText: "Loại bỏ",
      tone: "danger",
    });
    if (!ok) return;
    setRemoving(true);
    try {
      await removeSubmission(courseId, assignmentId);
      toast.success("Đã loại bỏ bài nộp", "Bài tập trở về trạng thái chưa nộp. Bạn có thể nộp lại khi còn hạn.");
      await load();
    } catch (err) {
      toast.error("Không thể loại bỏ bài nộp", (err as Error)?.message || "Vui lòng thử lại.");
    } finally {
      setRemoving(false);
    }
  };

  // ===================== Banner =====================
  const heroStats = (): HeroStat[] => {
    if (!assignment) return [];
    const stats: HeroStat[] = [
      { dot: "amber", label: `Hạn nộp ${formatDateTime(assignment.dueAt)}` },
      { dot: "violet", label: `${formatScore(assignment.maxScore)} điểm` },
      { dot: "sky", label: submissionTypesLabel(assignment) },
    ];
    if (assignment.allowLateSubmission) stats.push({ dot: "emerald", label: "Cho phép nộp trễ" });
    if (role === "STUDENT" && submission) {
      stats.push(
        submission.isLate
          ? { dot: "rose", label: "Đã nộp · Nộp trễ" }
          : { icon: Check, highlight: true, label: "Đã nộp" },
      );
    }
    if (role === "TEACHER" && teacherData) {
      stats.push({ dot: "slate", label: `${teacherData.summary.submitted}/${teacherData.summary.enrolled} đã nộp` });
    }
    if (isArchived) stats.push({ dot: "slate", label: "Khóa học đã lưu trữ (chỉ đọc)" });
    return stats;
  };

  // Trạng thái trên banner: phân biệt rõ "đang nhận bài", "quá hạn nhưng còn nhận bài trễ" và "đã hết hạn"
  const heroStatus = (() => {
    if (!assignment) return undefined;
    const caption = "Trạng thái bài tập";
    if (assignment.status === "DRAFT") return { caption, label: "Bản nháp", tone: "amber" as const };
    if (assignment.status === "CLOSED") return { caption, label: "Đã đóng", tone: "slate" as const };
    if (new Date(assignment.openAt).getTime() > now) return { caption, label: "Chưa mở nộp bài", tone: "amber" as const };
    if (new Date(assignment.dueAt).getTime() < now) {
      return assignment.allowLateSubmission
        ? { caption, label: "Quá hạn · còn nhận bài trễ", tone: "amber" as const }
        : { caption, label: "Đã hết hạn nộp", tone: "slate" as const };
    }
    return { caption, label: "Đang nhận bài", tone: "emerald" as const };
  })();

  const heroActions =
    role === "TEACHER" ? (
      <>
        {assignment && assignment.status !== "CLOSED" && !isArchived && (
          <HeroButton
            variant="solid"
            href={`/teacher/content/courses/${courseId}/lessons/new?section=${assignment.moduleId}&type=ASSIGNMENT&assignmentId=${assignment.id}`}
          >
            <Pencil className="h-4 w-4" /> Chỉnh sửa
          </HeroButton>
        )}
        {teacherData && teacherData.rows.some((r) => r.submission?.file) && (
          <HeroButton onClick={handleDownloadAll} disabled={zipping}>
            {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderDown className="h-4 w-4" />} Tải tất cả tệp (.zip)
          </HeroButton>
        )}
        <HeroButton href={`${coursePath}#module-section-${assignment?.moduleId ?? ""}`}>
          <ArrowLeft className="h-4 w-4" /> Về trang khóa học
        </HeroButton>
      </>
    ) : (
      <HeroButton href={`${coursePath}#module-section-${assignment?.moduleId ?? ""}`}>
        <ArrowLeft className="h-4 w-4" /> Về trang khóa học
      </HeroButton>
    );

  // ===================== Khối hành động của sinh viên =====================
  const renderStudentActions = () => {
    if (!mine || !assignment) return null;
    const { window } = mine;

    if (!window.canSubmit) {
      const reason = window.reason ? BLOCK_REASON_TEXT[window.reason] : "Hiện không thể nộp bài.";
      const Icon = window.reason === "GRADED" ? ShieldCheck : Lock;
      return (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[13.5px] text-slate-700">
          <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-500" />
          <span>{reason}</span>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {window.wouldBeLate && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
            <span>
              Đã quá hạn nộp. Giáo viên cho phép nộp trễ — bài {submission ? "sửa" : "nộp"} lúc này sẽ được đánh dấu{" "}
              <b>Nộp trễ</b>.
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {submission ? (
            <>
              <button
                type="button"
                onClick={() => router.push(submitHref)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e]"
              >
                <PencilLine className="h-4 w-4" /> Chỉnh sửa bài nộp
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={handleRemove}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Loại bỏ bài nộp
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push(submitHref)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e]"
            >
              <Send className="h-4 w-4" /> Nộp bài
            </button>
          )}
        </div>
        {submission && (
          <p className="text-center text-[12.5px] text-slate-500">
            Khi lưu chỉnh sửa, thời gian nộp sẽ được cập nhật thành thời điểm lưu.
          </p>
        )}
      </div>
    );
  };

  // ===================== Bảng trạng thái nộp bài (sinh viên) =====================
  const renderStudentStatus = () => {
    if (!assignment || !mine) return null;
    return (
      <Card title="Trạng thái nộp bài" icon={ClipboardList}>
        <div className="divide-y divide-slate-100">
          <StatusRow label="Trạng thái nộp bài">
            <StateBadge submission={submission} isPastDue={mine.window.isPastDue} />
          </StatusRow>
          <StatusRow label="Trạng thái chấm điểm">
            {submission?.status === "GRADED" ? (
              <span className="font-semibold text-sky-700">
                Đã chấm: {formatScore(submission.score)}/{formatScore(assignment.maxScore)} điểm
              </span>
            ) : (
              <span className="text-slate-600">Chưa chấm</span>
            )}
          </StatusRow>
          {submission?.status === "GRADED" && (
            <StatusRow label="Nhận xét của giáo viên" highlight>
              {submission.feedback ? (
                <div className="rounded-xl border border-sky-200 bg-white px-4 py-3">
                  <RichContent html={submission.feedback} className="!text-[13.5px]" />
                  {submission.gradedAt && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-400">
                      <MessageSquareText className="h-3.5 w-3.5" /> Chấm lúc {formatDateTime(submission.gradedAt)}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-slate-400">Giáo viên không để lại nhận xét.</span>
              )}
            </StatusRow>
          )}
          <StatusRow label="Hạn nộp">{formatDateTimeLong(assignment.dueAt)}</StatusRow>
          <StatusRow label="Thời gian còn lại" highlight={remaining?.tone === "danger" && !submission}>
            {remaining && <span className={`font-semibold ${REMAIN_TONE[remaining.tone]}`}>{remaining.text}</span>}
          </StatusRow>
          <StatusRow label="Lần sửa cuối">
            {submission ? (
              <span className="flex flex-wrap items-center gap-2">
                {formatDateTimeLong(submission.submittedAt)}
                {submission.isLate && (
                  <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11.5px] font-semibold text-red-600">Nộp trễ</span>
                )}
              </span>
            ) : (
              "—"
            )}
          </StatusRow>
          {assignment.allowTextSubmission && (
            <StatusRow label="Bài làm văn bản">
              {submission?.content ? <OnlineTextPreview html={submission.content} /> : <span className="text-slate-400">Chưa có</span>}
            </StatusRow>
          )}
          {assignment.allowFileSubmission && (
            <StatusRow label="Tệp đính kèm">
              {submission?.file ? (
                <SubmissionFileRow file={submission.file} onPreview={setPreviewFile} />
              ) : (
                <span className="text-slate-400">Chưa có</span>
              )}
            </StatusRow>
          )}
        </div>
        <div className="border-t border-slate-100 px-5 py-4">{renderStudentActions()}</div>
      </Card>
    );
  };

  // ===================== Bảng bài nộp (giáo viên) =====================
  const renderTeacherTable = () => {
    if (!assignment || !teacherData) return null;
    const { summary, rows } = teacherData;
    const ungraded = summary.submitted - summary.graded;
    const gradeHref = (id: string) => `${coursePath}/assignments/${assignmentId}/submissions/${id}`;
    const filters: { key: typeof filter; label: string; count: number }[] = [
      { key: "all", label: "Tất cả", count: rows.length },
      { key: "ungraded", label: "Chưa chấm", count: ungraded },
      { key: "graded", label: "Đã chấm", count: summary.graded },
      { key: "late", label: "Nộp trễ", count: summary.late },
      { key: "missing", label: "Chưa nộp", count: summary.notSubmitted },
    ];
    const visibleRows = rows.filter(({ submission: s }) => {
      if (filter === "ungraded") return s && s.status !== "GRADED";
      if (filter === "graded") return s?.status === "GRADED";
      if (filter === "late") return s?.isLate;
      if (filter === "missing") return !s;
      return true;
    });
    const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pagedRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Sinh viên" value={summary.enrolled} tone="slate" />
          <StatTile label="Đã nộp" value={summary.submitted} tone="emerald" />
          <StatTile label="Nộp trễ" value={summary.late} tone="amber" />
          <StatTile label="Chưa nộp" value={summary.notSubmitted} tone="red" />
          <StatTile label="Đã chấm" value={summary.graded} tone="sky" />
        </div>

        <Card
          title="Bài nộp của sinh viên"
          icon={Users}
          centerTitle
        >
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
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Sinh viên</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Trạng thái</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Thời gian nộp</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Bài nộp</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Điểm</th>
                    <th className="px-5 py-2.5 text-center font-semibold">Chấm bài</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-slate-400">
                        Không có sinh viên nào trong bộ lọc này.
                      </td>
                    </tr>
                  )}
                  {pagedRows.map(({ student, submission: s }) => {
                    const lateBy = s?.isLate ? timeRemainingLabel(assignment.dueAt, s, now) : null;
                    return (
                      <tr key={student.id} className={`align-middle ${s?.isLate ? "bg-amber-50/40" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element -- avatar từ Cloudinary / ảnh tĩnh */}
                            <img
                              src={student.avatarUrl || "/images/student.webp"}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-slate-800">{student.fullName}</span>
                              <span className="block truncate text-[11.5px] text-slate-500">{student.email}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <StateBadge submission={s} isPastDue={teacherData.window.isPastDue} fixed />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-center text-slate-700">
                          {s ? (
                            <>
                              {formatDateTime(s.submittedAt)}
                              {lateBy && <span className="block text-[11.5px] font-semibold text-red-600">{lateBy.text}</span>}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {s ? (
                            // Thẻ cùng kích thước để các dòng thẳng hàng; tên tệp dài hiện "…" (xem đầy đủ khi mở)
                            <div className="inline-flex flex-col items-stretch gap-1.5">
                              {s.content && (
                                <button
                                  type="button"
                                  onClick={() => setViewing(s)}
                                  className="inline-flex h-8 w-[176px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="h-3.5 w-3.5 shrink-0" /> Xem bài làm
                                </button>
                              )}
                              {s.file && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile(s.file)}
                                  title={s.file.fileName}
                                  className="inline-flex h-8 w-[176px] items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 text-[12px] font-semibold text-[#0f6cbf] hover:bg-blue-50"
                                >
                                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                  <span className="min-w-0 truncate">{s.file.fileName}</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-800">
                          {s?.status === "GRADED" ? `${formatScore(s.score)}/${formatScore(assignment.maxScore)}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {s ? (
                            <button
                              type="button"
                              onClick={() => router.push(gradeHref(s.id))}
                              className={`inline-flex h-9 w-[124px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[12.5px] font-semibold transition ${
                                s.status === "GRADED"
                                  ? "border border-[#0f6cbf]/40 bg-white text-[#0f6cbf] hover:bg-blue-50"
                                  : "bg-[#0f6cbf] text-white hover:bg-[#0c599e]"
                              }`}
                            >
                              <PencilLine className="h-3.5 w-3.5" /> {s.status === "GRADED" ? "Sửa điểm" : "Chấm điểm"}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleRows.length > PAGE_SIZE && (
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  from={(currentPage - 1) * PAGE_SIZE + 1}
                  to={Math.min(currentPage * PAGE_SIZE, visibleRows.length)}
                  total={visibleRows.length}
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
    <CourseShell course={course} role={role} backHref={backHref} activeModuleId={assignment?.moduleId}>
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <CourseHero
          eyebrow={{
            icon: ClipboardList,
            primary: course?.name ?? "Khóa học",
            primaryHref: coursePath,
            secondary: topic?.title,
            secondaryHref: topic ? `${coursePath}#module-section-${topic.id}` : undefined,
          }}
          title={assignment?.title ?? "Bài tập"}
          stats={heroStats()}
          brandTag="Bài tập"
          status={heroStatus}
          actions={heroActions}
        />
      </div>

      <main className="page-enter mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : !assignment ? (
          <div className="grid place-items-center rounded-2xl bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              <Card title="Mô tả & Hướng dẫn" icon={FileText}>
                {assignment.description ? (
                  <RichContent html={assignment.description} className="px-5 py-4 !text-[14.5px] text-slate-700" />
                ) : (
                  <p className="px-5 py-6 text-[13.5px] italic text-slate-400">Giáo viên chưa thêm mô tả cho bài tập này.</p>
                )}
              </Card>

              {role === "STUDENT" ? renderStudentStatus() : renderTeacherTable()}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Card title="Thông tin bài tập" icon={Info}>
                <div className="py-2">
                  <InfoRow icon={CalendarDays} label="Mở nộp bài" value={formatDateTime(assignment.openAt)} />
                  <InfoRow icon={CalendarClock} label="Hạn nộp" value={formatDateTime(assignment.dueAt)} />
                  <InfoRow icon={Award} label="Điểm tối đa" value={`${formatScore(assignment.maxScore)} điểm`} />
                  <InfoRow icon={FileUp} label="Hình thức nộp" value={submissionTypesLabel(assignment)} />
                  <InfoRow
                    icon={Clock}
                    label="Nộp trễ"
                    value={
                      assignment.allowLateSubmission ? (
                        <span className="text-emerald-700">Cho phép (bài nộp sau hạn được đánh dấu “Nộp trễ”)</span>
                      ) : (
                        <span className="text-slate-700">Không nhận bài sau hạn</span>
                      )
                    }
                  />
                  {topic && <InfoRow icon={ClipboardList} label="Topic" value={topic.title} />}
                </div>
              </Card>

              {role === "STUDENT" && assignment.allowFileSubmission && mine && (
                <Card title="Quy định tệp nộp" icon={ShieldCheck}>
                  <ul className="space-y-2 px-5 py-4 text-[13px] text-slate-600">
                    {[
                      <>
                        Mỗi bài nộp đính kèm <b>1 tệp</b> — nhiều tệp thì nén thành .zip.
                      </>,
                      <>
                        Dung lượng tối đa <b>{formatFileSize(mine.rules.maxFileBytes)}</b>.
                      </>,
                      <>Không nhận tệp thực thi / mã script ({mine.rules.blockedExtensions.slice(0, 6).join(", ")}, …).</>,
                      <>Tệp được lưu riêng tư — chỉ bạn và giáo viên phụ trách xem được.</>,
                    ].map((rule, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f6cbf]" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </aside>
          </div>
        )}
      </main>

      <DocumentPreview
        resourceId={previewFile?.id ?? null}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        initialFileName={previewFile?.fileName}
        initialFileSize={previewFile?.fileSizeBytes}
        initialMimeType={previewFile?.mimeType}
      />

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? `Bài làm của ${viewing.student.fullName}` : ""}
        widthClass="max-w-[860px]"
      >
        {viewing && (
          <div className="space-y-3">
            <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-slate-500">
              Nộp lúc {formatDateTime(viewing.submittedAt)}
              {viewing.isLate && (
                <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11.5px] font-semibold text-red-600">Nộp trễ</span>
              )}
            </p>
            <div className="max-h-[65vh] overflow-y-auto rounded-xl border border-slate-200 px-5 py-4">
              <RichContent html={viewing.content} />
            </div>
          </div>
        )}
      </Modal>
    </CourseShell>
  );
}
