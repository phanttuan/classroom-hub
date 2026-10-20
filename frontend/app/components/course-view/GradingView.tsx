"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  Save,
  SaveAll,
  Users,
} from "lucide-react";
import type { AssignmentDto } from "@/lib/types/assignment";
import type { SubmissionDto, SubmissionFileDto, TeacherSubmissionListResponse } from "@/lib/types/submission";
import { fetchAssignmentDetail } from "@/lib/api/assignment-api";
import {
  fetchAssignmentSubmissions,
  fetchSubmissionDetail,
  gradeSubmission,
  ungradeSubmission,
} from "@/lib/api/submission-api";
import { fetchResourcePreview, triggerResourceDownload } from "@/lib/api/resource-api";
import { uploadContentAttachment, uploadContentImage } from "@/lib/api/learning-content-api";
import { formatDateTime, formatScore, submissionStateLabel, timeRemainingLabel } from "@/lib/assignment-utils";
import { fileTypeLabel, formatFileSize } from "@/lib/lesson-types";
import { toast } from "@/app/components/common/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import RichContent from "@/components/content/RichContent";
import RichTextEditor from "@/components/editor/RichTextEditor";
import InlineOfficePreview, { officeKindOf } from "@/components/resource/InlineOfficePreview";
import CourseShell, { coursePathOf, useCourseContent } from "./CourseShell";
import CourseHero, { HeroButton, type HeroStat } from "./CourseHero";

interface GradingViewProps {
  courseId: string;
  assignmentId: string;
  submissionId: string;
}

/** Tệp xem trực tiếp được trong trang (PDF / ảnh / video / audio); Word / Excel mở bằng trình xem riêng */
const isInlinePreviewable = (mime: string) =>
  mime === "application/pdf" || mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");

function Card({ title, icon: Icon, children, className = "", aside }: { title?: string; icon?: typeof FileText; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-slate-200/90 bg-white shadow-xs ${className}`}>
      {title && (
        <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 text-[14px] font-bold text-slate-800">
          {Icon && <Icon className="h-4 w-4 text-[#0f6cbf]" />}
          {title}
          {aside && <span className="ml-auto">{aside}</span>}
        </h2>
      )}
      {children}
    </section>
  );
}

/** Nhúng tệp bài nộp qua signed URL có hạn */
function InlineFile({ file }: { file: SubmissionFileDto }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Component được gắn key={file.id} ở nơi dùng → đổi tệp là mount lại, không cần reset state trong effect
  useEffect(() => {
    let active = true;
    fetchResourcePreview(file.id)
      .then((r) => active && setUrl(r.url))
      .catch((err) => active && setError((err as Error)?.message || "Không tải được tệp"));
    return () => {
      active = false;
    };
  }, [file.id]);

  if (error) return <p className="m-5 rounded-xl bg-amber-50 p-4 text-[13.5px] text-amber-800">{error}</p>;
  if (!url)
    return (
      <div className="grid h-[60vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#0f6cbf]" />
      </div>
    );
  const mime = file.mimeType;
  if (mime.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element -- signed URL ngoài, không qua next/image
    return <img src={url} alt={file.fileName} className="mx-auto max-h-[75vh] rounded-xl" />;
  }
  if (mime.startsWith("video/")) return <video src={url} controls className="w-full rounded-xl bg-black" />;
  if (mime.startsWith("audio/")) return <audio src={url} controls className="m-5 w-[calc(100%-2.5rem)]" />;
  return <iframe src={url} title={file.fileName} className="h-[75vh] w-full rounded-xl" />;
}

export default function GradingView({ courseId, assignmentId, submissionId }: GradingViewProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const coursePath = coursePathOf("TEACHER", courseId);
  const assignmentPath = `${coursePath}/assignments/${assignmentId}`;
  const { course } = useCourseContent(courseId);

  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [list, setList] = useState<TeacherSubmissionListResponse | null>(null);
  const [submission, setSubmission] = useState<SubmissionDto | null>(null);
  const [error, setError] = useState("");

  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<null | "save" | "next" | "ungrade">(null);
  const [formError, setFormError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const applySubmission = useCallback((s: SubmissionDto) => {
    setSubmission(s);
    setScore(s.score !== null ? formatScore(s.score) : "");
    setFeedback(s.feedback ?? "");
    setDirty(false);
    setFormError("");
  }, []);

  // Tải bài tập + danh sách (để điều hướng trước / sau) + bài nộp đang chấm
  useEffect(() => {
    let active = true;
    Promise.all([
      fetchAssignmentDetail(courseId, assignmentId),
      fetchAssignmentSubmissions(courseId, assignmentId),
      fetchSubmissionDetail(courseId, assignmentId, submissionId),
    ])
      .then(([a, l, s]) => {
        if (!active) return;
        setAssignment(a);
        setList(l);
        applySubmission(s);
        setError("");
      })
      .catch((err) => active && setError((err as Error)?.message || "Không tải được bài nộp"));
    return () => {
      active = false;
    };
  }, [courseId, assignmentId, submissionId, applySubmission]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Danh sách bài đã nộp (theo thứ tự tên) để chuyển bài trước / sau
  const submitted = useMemo(() => (list?.rows ?? []).filter((r) => r.submission).map((r) => r.submission!), [list]);
  const index = submitted.findIndex((s) => s.id === submissionId);
  const prev = index > 0 ? submitted[index - 1] : undefined;
  const next = index >= 0 && index < submitted.length - 1 ? submitted[index + 1] : undefined;
  const nextUngraded = submitted.find((s, i) => i > index && s.status !== "GRADED") ?? submitted.find((s) => s.status !== "GRADED" && s.id !== submissionId);
  const gradedCount = submitted.filter((s) => s.status === "GRADED").length;

  const gradeHref = (id: string) => `${assignmentPath}/submissions/${id}`;

  const leaveTo = async (href: string) => {
    if (dirty) {
      const ok = await confirm({
        title: "Rời trang khi chưa lưu điểm?",
        message: "Điểm và nhận xét đang nhập sẽ bị mất.",
        confirmText: "Rời trang",
        tone: "warning",
      });
      if (!ok) return;
    }
    setDirty(false);
    router.push(href);
  };

  const maxScore = assignment ? Number(assignment.maxScore) : 0;

  const save = async (mode: "save" | "next") => {
    if (!assignment || !submission) return;
    const parsed = Number(score.trim().replace(",", "."));
    if (score.trim() === "" || !Number.isFinite(parsed)) {
      setFormError("Vui lòng nhập điểm");
      return;
    }
    if (parsed < 0 || parsed > maxScore) {
      setFormError(`Điểm phải nằm trong khoảng 0 – ${formatScore(maxScore)}`);
      return;
    }
    setFormError("");
    setSaving(mode);
    try {
      const saved = await gradeSubmission(courseId, assignmentId, submission.id, { score: parsed, feedback });
      applySubmission(saved);
      setList((l) =>
        l ? { ...l, rows: l.rows.map((r) => (r.submission?.id === saved.id ? { ...r, submission: saved } : r)) } : l,
      );
      toast.success(`Đã lưu điểm ${formatScore(saved.score)}/${formatScore(maxScore)}`, saved.student.fullName);
      if (mode === "next") {
        const target = submitted.find((s, i) => i > index && s.status !== "GRADED" && s.id !== saved.id) ?? next;
        if (target) router.push(gradeHref(target.id));
        else {
          toast.info("Đã chấm hết bài nộp", "Quay về danh sách bài nộp.");
          router.push(assignmentPath);
        }
      }
    } catch (err) {
      setFormError((err as Error)?.message || "Không thể lưu điểm");
    } finally {
      setSaving(null);
    }
  };

  const handleUngrade = async () => {
    if (!submission) return;
    const ok = await confirm({
      title: "Bỏ chấm bài nộp này?",
      message: (
        <>
          Điểm và nhận xét của <b>{submission.student.fullName}</b> sẽ bị xóa; sinh viên có thể chỉnh sửa bài nộp lại nếu còn hạn.
        </>
      ),
      confirmText: "Bỏ chấm",
      tone: "danger",
    });
    if (!ok) return;
    setSaving("ungrade");
    try {
      const s = await ungradeSubmission(courseId, assignmentId, submission.id);
      applySubmission(s);
      setList((l) => (l ? { ...l, rows: l.rows.map((r) => (r.submission?.id === s.id ? { ...r, submission: s } : r)) } : l));
      toast.success("Đã bỏ chấm", "Điểm và nhận xét đã xóa; sinh viên có thể nộp lại khi còn hạn.");
    } catch (err) {
      toast.error("Không thể bỏ chấm", (err as Error)?.message || "Vui lòng thử lại.");
    } finally {
      setSaving(null);
    }
  };

  // ===================== Banner =====================
  const heroStats = (): HeroStat[] => {
    if (!assignment || !submission) return [];
    const state = submissionStateLabel(submission, list?.window);
    const stats: HeroStat[] = [
      { dot: "amber", label: `Nộp lúc ${formatDateTime(submission.submittedAt)}` },
      submission.isLate
        ? { dot: "rose", label: timeRemainingLabel(assignment.dueAt, submission).text }
        : { dot: "emerald", label: "Nộp đúng hạn" },
      { dot: "violet", label: `Thang điểm ${formatScore(assignment.maxScore)}` },
      { dot: "sky", label: `Đã chấm ${gradedCount}/${submitted.length} bài` },
    ];
    if (submission.status === "GRADED") stats.push({ icon: CheckCircle2, highlight: true, label: state.label });
    return stats;
  };

  const file = submission?.file ?? null;

  return (
    <CourseShell course={course} role="TEACHER" backHref="/teacher/content/courses" activeModuleId={assignment?.moduleId}>
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <CourseHero
          eyebrow={{
            icon: ClipboardList,
            primary: course?.name ?? "Khóa học",
            primaryHref: coursePath,
            secondary: assignment?.title ?? "Bài tập",
            secondaryHref: assignmentPath,
          }}
          onNavigate={(href) => void leaveTo(href)}
          title={submission ? `Chấm bài: ${submission.student.fullName}` : "Chấm bài"}
          stats={heroStats()}
          brandTag="Chấm bài"
          status={{
            caption: "Bài nộp",
            label: submitted.length ? `${index + 1} / ${submitted.length}` : "—",
            tone: "sky",
          }}
          actions={
            <>
              <HeroButton onClick={() => void leaveTo(prev ? gradeHref(prev.id) : assignmentPath)} disabled={!prev}>
                <ChevronLeft className="h-4 w-4" /> Bài trước
              </HeroButton>
              <HeroButton onClick={() => void leaveTo(next ? gradeHref(next.id) : assignmentPath)} disabled={!next}>
                Bài sau <ChevronRight className="h-4 w-4" />
              </HeroButton>
              <HeroButton onClick={() => void leaveTo(assignmentPath)}>
                <ArrowLeft className="h-4 w-4" /> Danh sách bài nộp
              </HeroButton>
            </>
          }
        />
      </div>

      <main className="page-enter mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : !assignment || !submission ? (
          <div className="grid place-items-center rounded-2xl bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
          </div>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* ===================== Bài nộp của sinh viên ===================== */}
            <div className="min-w-0 space-y-5">
              <Card>
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- avatar từ Cloudinary / ảnh tĩnh */}
                  <img
                    src={submission.student.avatarUrl || "/images/student.webp"}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-slate-900">{submission.student.fullName}</p>
                    <p className="truncate text-[12.5px] text-slate-500">{submission.student.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                      <Clock className="h-3.5 w-3.5" /> {formatDateTime(submission.submittedAt)}
                    </span>
                    {submission.isLate && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Nộp trễ
                      </span>
                    )}
                    {submission.status === "GRADED" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đã chấm {formatScore(submission.score)}/{formatScore(maxScore)}
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {assignment.allowTextSubmission && (
                <Card title="Bài làm văn bản" icon={FileText}>
                  {submission.content ? (
                    <RichContent html={submission.content} className="px-6 py-5 !text-[15px] !leading-[1.75]" />
                  ) : (
                    <p className="px-5 py-6 text-[13.5px] italic text-slate-400">Sinh viên không nộp bài làm văn bản.</p>
                  )}
                </Card>
              )}

              {assignment.allowFileSubmission && (
                <Card
                  title="Tệp đính kèm"
                  icon={Paperclip}
                  aside={
                    file && (
                      <button
                        type="button"
                        disabled={downloading}
                        onClick={async () => {
                          setDownloading(true);
                          await triggerResourceDownload(file.id, file.fileName).catch(() => toast.error("Không tải được tệp", "Vui lòng thử lại sau ít phút."));
                          setDownloading(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        Tải xuống
                      </button>
                    )
                  }
                >
                  {!file ? (
                    <p className="px-5 py-6 text-[13.5px] italic text-slate-400">Sinh viên không đính kèm tệp.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#0f6cbf]">
                          <FileText className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-slate-800">{file.fileName}</span>
                          <span className="text-[11.5px] text-slate-500">
                            {fileTypeLabel(file.fileName, file.mimeType)} · {formatFileSize(file.fileSizeBytes)}
                          </span>
                        </span>
                      </div>
                      {isInlinePreviewable(file.mimeType) ? (
                        <div className="bg-slate-50 p-2">
                          <InlineFile key={file.id} file={file} />
                        </div>
                      ) : officeKindOf(file.mimeType, file.fileName) ? (
                        // Word / Excel render thẳng trong trang — không cần mở trình xem riêng
                        <InlineOfficePreview key={file.id} resourceId={file.id} fileName={file.fileName} mimeType={file.mimeType} />
                      ) : (
                        <p className="px-5 py-4 text-[13px] text-slate-500">
                          Định dạng này không xem trực tiếp được — hãy tải xuống để chấm.
                        </p>
                      )}
                    </>
                  )}
                </Card>
              )}
            </div>

            {/* ===================== Bảng điểm & nhận xét ===================== */}
            <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
              <Card title="Điểm & nhận xét" icon={Award}>
                <div className="space-y-4 px-5 py-4">
                  <div>
                    <label className="text-[13px] font-semibold text-slate-700">
                      Điểm <span className="text-red-600">*</span>
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.25"
                        min={0}
                        max={maxScore}
                        value={score}
                        onChange={(e) => {
                          setScore(e.target.value);
                          setDirty(true);
                          setFormError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void save("save");
                          }
                        }}
                        placeholder="0"
                        className="h-11 w-32 rounded-lg border border-slate-300 px-3 text-[18px] font-bold text-slate-900 outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                      />
                      <span className="text-[15px] font-semibold text-slate-500">/ {formatScore(maxScore)}</span>
                      {/* Điểm nhanh */}
                      <div className="ml-auto flex gap-1">
                        {[1, 0.75, 0.5].map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => {
                              setScore(formatScore(maxScore * ratio));
                              setDirty(true);
                              setFormError("");
                            }}
                            className="rounded-md border border-slate-200 px-2 py-1 text-[11.5px] font-semibold text-slate-600 hover:border-[#0f6cbf] hover:text-[#0f6cbf]"
                            title={`${Math.round(ratio * 100)}% thang điểm`}
                          >
                            {formatScore(maxScore * ratio)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                      <MessageSquareText className="h-4 w-4 text-slate-400" /> Nhận xét
                    </label>
                    <div className="mt-1.5">
                      <RichTextEditor
                        value={feedback}
                        onChange={(html) => {
                          setFeedback(html);
                          setDirty(true);
                        }}
                        onUploadImage={(f) => uploadContentImage(courseId, f)}
                        onUploadAttachment={(f) => uploadContentAttachment(courseId, f)}
                        placeholder="Nhận xét cho sinh viên: điểm mạnh, lỗi cần sửa, gợi ý cải thiện..."
                        minHeight={220}
                        compact
                      />
                    </div>
                  </div>

                  {formError && (
                    <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
                    </p>
                  )}

                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      disabled={!!saving}
                      onClick={() => void save("save")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
                    >
                      {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {submission.status === "GRADED" ? "Lưu thay đổi" : "Lưu điểm"}
                    </button>
                    {(nextUngraded || next) && (
                      <button
                        type="button"
                        disabled={!!saving}
                        onClick={() => void save("next")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0f6cbf]/40 bg-blue-50 px-4 py-2.5 text-[14px] font-semibold text-[#0f6cbf] hover:bg-blue-100 disabled:opacity-60"
                      >
                        {saving === "next" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveAll className="h-4 w-4" />}
                        Lưu và chấm bài tiếp theo
                      </button>
                    )}
                    {submission.status === "GRADED" && (
                      <button
                        type="button"
                        disabled={!!saving}
                        onClick={handleUngrade}
                        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {saving === "ungrade" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Bỏ chấm (cho phép nộp lại)
                      </button>
                    )}
                  </div>
                  {submission.gradedAt && !dirty && (
                    <p className="text-center text-[12px] text-slate-400">Chấm lần cuối {formatDateTime(submission.gradedAt)}</p>
                  )}
                </div>
              </Card>

              <Card title="Sinh viên đã nộp" icon={Users}>
                <ul className="max-h-[40vh] divide-y divide-slate-100 overflow-y-auto">
                  {submitted.map((s, i) => (
                    <li key={s.id}>
                      <Link
                        href={gradeHref(s.id)}
                        onClick={(e) => {
                          e.preventDefault();
                          void leaveTo(gradeHref(s.id));
                        }}
                        className={`flex items-center gap-2.5 px-4 py-2 text-[13px] transition ${
                          s.id === submissionId ? "bg-blue-50 font-semibold text-[#0f6cbf]" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="w-5 shrink-0 text-right text-[11.5px] text-slate-400">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate">{s.student.fullName}</span>
                        {s.isLate && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                        {s.status === "GRADED" ? (
                          <span className="shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700">
                            {formatScore(s.score)}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">Chưa chấm</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        )}
      </main>

    </CourseShell>
  );
}
