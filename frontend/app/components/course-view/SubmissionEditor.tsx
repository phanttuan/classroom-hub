"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FileText,
  Lightbulb,
  Loader2,
  Lock,
  Paperclip,
  RefreshCw,
  Save,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { AssignmentDto } from "@/lib/types/assignment";
import type { MySubmissionResponse } from "@/lib/types/submission";
import { fetchAssignmentDetail } from "@/lib/api/assignment-api";
import { fetchMySubmission, saveSubmission } from "@/lib/api/submission-api";
import { BLOCK_REASON_TEXT, formatDateTime, timeRemainingLabel } from "@/lib/assignment-utils";
import { fileTypeLabel, formatFileSize } from "@/lib/lesson-types";
import { toast } from "@/app/components/common/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import RichTextEditor from "@/components/editor/RichTextEditor";
import CourseShell, { coursePathOf, useCourseContent } from "./CourseShell";
import CourseHero, { HeroButton, type HeroStat } from "./CourseHero";
import { Field, Fieldset } from "./form-controls";

interface SubmissionEditorProps {
  courseId: string;
  assignmentId: string;
}

/** Có nội dung thật (ngoài thẻ rỗng của trình soạn thảo) */
const hasText = (html: string) => /<img\b/i.test(html) || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;

const TIPS = [
  "Bài làm văn bản hỗ trợ đầy đủ định dạng: tiêu đề, danh sách, bảng, khối mã, liên kết…",
  "Chỉ đính kèm được 1 tệp — nhiều tệp (mã nguồn, ảnh, báo cáo) thì nén thành .zip trước khi nộp.",
  "Tệp thực thi (.exe, .bat, .js, .html…) bị từ chối để bảo đảm an toàn cho hệ thống.",
  "Sau khi nộp vẫn có thể chỉnh sửa hoặc loại bỏ bài nộp cho tới hạn nộp (hoặc muộn hơn nếu giáo viên cho phép nộp trễ).",
];

/** Trang nộp bài / chỉnh sửa bài nộp của sinh viên (bố cục giống trang soạn thảo của giáo viên) */
export default function SubmissionEditor({ courseId, assignmentId }: SubmissionEditorProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const coursePath = coursePathOf("STUDENT", courseId);
  const assignmentPath = `${coursePath}/assignments/${assignmentId}`;
  const { course } = useCourseContent(courseId);

  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [mine, setMine] = useState<MySubmissionResponse | null>(null);
  const [loadError, setLoadError] = useState("");

  const [content, setContent] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAssignmentDetail(courseId, assignmentId), fetchMySubmission(courseId, assignmentId)])
      .then(([a, m]) => {
        if (!active) return;
        setAssignment(a);
        setMine(m);
        setContent(m.submission?.content ?? "");
      })
      .catch((err) => active && setLoadError((err as Error)?.message || "Không tải được bài tập"));
    return () => {
      active = false;
    };
  }, [courseId, assignmentId]);

  // Cảnh báo khi rời trang mà chưa lưu
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const submission = mine?.submission ?? null;
  const isEdit = Boolean(submission);
  const window_ = mine?.window;
  const rules = mine?.rules;
  const existingFile = submission?.file && !removeExistingFile ? submission.file : null;

  const markDirty = () => setDirty(true);

  /** Kiểm tra sớm ở trình duyệt theo đúng quy tắc backend trả về (backend vẫn kiểm tra lại) */
  const acceptFile = (list: FileList | File[]) => {
    const files = Array.from(list);
    if (files.length === 0) return;
    if (files.length > 1) {
      setErrors((er) => ({ ...er, file: "Chỉ nhận 1 tệp — hãy nén tất cả thành một tệp .zip rồi chọn lại." }));
      return;
    }
    const file = files[0];
    const ext = file.name.includes(".") ? `.${file.name.split(".").pop()!.toLowerCase()}` : "";
    if (rules && ext && rules.blockedExtensions.includes(ext)) {
      setErrors((er) => ({ ...er, file: `Không nhận loại tệp "${ext}". Hãy nén thành .zip nếu cần nộp mã nguồn.` }));
      return;
    }
    if (rules && file.size > rules.maxFileBytes) {
      setErrors((er) => ({
        ...er,
        file: `Tệp ${formatFileSize(file.size)} vượt quá giới hạn ${formatFileSize(rules.maxFileBytes)}.`,
      }));
      return;
    }
    if (file.size === 0) {
      setErrors((er) => ({ ...er, file: "Tệp rỗng." }));
      return;
    }
    setPendingFile(file);
    setErrors((er) => ({ ...er, file: "", form: "" }));
    markDirty();
  };

  const leaveTo = async (href: string) => {
    if (dirty) {
      const ok = await confirm({
        title: "Rời trang khi chưa lưu?",
        message: "Thay đổi trong bài nộp sẽ bị mất.",
        confirmText: "Rời trang",
        tone: "warning",
      });
      if (!ok) return;
    }
    setDirty(false);
    router.push(href);
  };

  const handleSave = async () => {
    if (!assignment || !mine) return;
    setSubmitError("");
    const next: Record<string, string> = {};
    const textProvided = assignment.allowTextSubmission && hasText(content);
    const fileProvided = assignment.allowFileSubmission && Boolean(pendingFile || existingFile);
    if (!textProvided && !fileProvided) {
      next.form =
        assignment.allowTextSubmission && assignment.allowFileSubmission
          ? "Hãy nhập bài làm văn bản hoặc đính kèm tệp trước khi nộp."
          : assignment.allowFileSubmission
            ? "Hãy đính kèm tệp bài làm."
            : "Hãy nhập bài làm văn bản.";
    }
    if (Object.keys(next).length) {
      setErrors((er) => ({ ...er, ...next }));
      return;
    }

    if (isEdit || mine.window.wouldBeLate) {
      const ok = await confirm({
        title: isEdit ? "Lưu chỉnh sửa bài nộp?" : "Xác nhận nộp bài trễ?",
        message: (
          <>
            {isEdit && (
              <>
                Thời gian nộp sẽ được cập nhật thành <b>thời điểm hiện tại</b>.{" "}
              </>
            )}
            {mine.window.wouldBeLate && (
              <>
                Đã quá hạn nộp — bài nộp sẽ bị đánh dấu <b>Nộp trễ</b> ở cả phía bạn và giáo viên.
              </>
            )}
          </>
        ),
        confirmText: isEdit ? "Lưu bài nộp" : "Nộp bài",
        tone: mine.window.wouldBeLate ? "warning" : "primary",
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const saved = await saveSubmission(courseId, assignmentId, {
        content: assignment.allowTextSubmission ? content : undefined,
        file: pendingFile,
        removeFile: removeExistingFile && !pendingFile,
      });
      setDirty(false);
      toast.success(
        isEdit ? "Đã lưu bài nộp" : "Nộp bài thành công",
        saved.isLate ? "Bài nộp được đánh dấu Nộp trễ." : `Thời gian nộp: ${formatDateTime(saved.submittedAt)}`,
      );
      router.push(assignmentPath);
    } catch (err) {
      setSubmitError((err as Error)?.message || "Không thể lưu bài nộp. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // ===================== Banner =====================
  const heroStats = (): HeroStat[] => {
    if (!assignment) return [];
    const stats: HeroStat[] = [{ dot: "amber", label: `Hạn nộp ${formatDateTime(assignment.dueAt)}` }];
    const remain = timeRemainingLabel(assignment.dueAt, null);
    stats.push({ dot: remain.tone === "danger" ? "rose" : remain.tone === "warning" ? "amber" : "sky", label: remain.text });
    if (window_?.wouldBeLate) stats.push({ dot: "rose", label: "Sẽ được đánh dấu Nộp trễ" });
    stats.push(dirty ? { dot: "rose", label: "Có thay đổi chưa lưu" } : { dot: "emerald", label: isEdit ? "Đang chỉnh sửa bài nộp" : "Bài nộp mới" });
    return stats;
  };

  const blocked = mine && !mine.window.canSubmit;

  return (
    <CourseShell course={course} role="STUDENT" backHref="/student/content" activeModuleId={assignment?.moduleId}>
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
          title={isEdit ? "Chỉnh sửa bài nộp" : "Nộp bài"}
          stats={heroStats()}
          brandTag="Nộp bài"
          status={{ caption: "Chế độ", label: isEdit ? "Chỉnh sửa" : "Nộp mới", tone: "sky" }}
          actions={
            <HeroButton onClick={() => void leaveTo(assignmentPath)}>
              <ArrowLeft className="h-4 w-4" /> Về trang bài tập
            </HeroButton>
          }
        />
      </div>

      <main className="page-enter mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{loadError}</div>
        ) : !assignment || !mine ? (
          <div className="grid place-items-center rounded-2xl bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
          </div>
        ) : blocked ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-xs">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Lock className="h-8 w-8" />
            </div>
            <p className="mt-4 text-[18px] font-bold text-slate-900">Hiện không thể nộp bài</p>
            <p className="mt-1 max-w-md text-[14px] text-slate-500">
              {mine.window.reason ? BLOCK_REASON_TEXT[mine.window.reason] : "Bài tập không nhận bài nộp vào lúc này."}
            </p>
            <button
              type="button"
              onClick={() => router.push(assignmentPath)}
              className="mt-5 rounded-xl bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e]"
            >
              Về trang bài tập
            </button>
          </div>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
              className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
            >
              {mine.window.wouldBeLate && (
                <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3.5 text-[13.5px] text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
                  <span>
                    Đã quá hạn nộp ({formatDateTime(assignment.dueAt)}). Giáo viên cho phép nộp trễ — bài nộp sẽ được đánh dấu{" "}
                    <b>Nộp trễ</b>.
                  </span>
                </div>
              )}

              {/* ============ BÀI LÀM TRỰC TUYẾN ============ */}
              {assignment.allowTextSubmission && (
                <Fieldset title="Bài làm văn bản">
                  <Field
                    label="Nội dung bài làm"
                    required={!assignment.allowFileSubmission}
                    hint="Soạn câu trả lời trực tiếp. Có thể dán liên kết, chèn bảng, khối mã, danh sách…"
                  >
                    <RichTextEditor
                      value={content}
                      onChange={(html) => {
                        setContent(html);
                        setErrors((er) => ({ ...er, form: "" }));
                        markDirty();
                      }}
                      placeholder="Nhập bài làm của bạn..."
                      minHeight={360}
                    />
                  </Field>
                </Fieldset>
              )}

              {/* ============ TỆP ĐÍNH KÈM ============ */}
              {assignment.allowFileSubmission && (
                <Fieldset title="Tệp đính kèm">
                  <Field
                    label="Tệp bài làm"
                    required={!assignment.allowTextSubmission}
                    error={errors.file}
                    hint={`1 tệp, tối đa ${formatFileSize(mine.rules.maxFileBytes)}. Nhiều tệp thì nén thành .zip. Không nhận tệp thực thi (${mine.rules.blockedExtensions.slice(0, 5).join(", ")}, …).`}
                  >
                    {pendingFile ? (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-200">
                          <Paperclip className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-slate-800">{pendingFile.name}</span>
                          <span className="text-[11.5px] text-slate-500">
                            {fileTypeLabel(pendingFile.name, pendingFile.type)} · {formatFileSize(pendingFile.size)} · tệp mới
                            {submission?.file ? " (thay thế tệp cũ khi lưu)" : ""}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          title="Chọn tệp khác"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingFile(null);
                            markDirty();
                          }}
                          title="Bỏ tệp"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : existingFile ? (
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#0f6cbf] ring-1 ring-slate-200">
                          <FileText className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-slate-800">{existingFile.fileName}</span>
                          <span className="text-[11.5px] text-slate-500">
                            {fileTypeLabel(existingFile.fileName, existingFile.mimeType)} · {formatFileSize(existingFile.fileSizeBytes)} · đã nộp
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Thay tệp
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRemoveExistingFile(true);
                            markDirty();
                          }}
                          title="Gỡ tệp"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          acceptFile(e.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                          dragOver ? "border-[#0f6cbf] bg-blue-50" : "border-slate-300 bg-slate-50/60 hover:border-[#0f6cbf] hover:bg-blue-50/40"
                        }`}
                      >
                        <UploadCloud className="h-8 w-8 text-[#0f6cbf]" />
                        <p className="text-[14px] font-semibold text-slate-800">Kéo thả tệp vào đây hoặc bấm để chọn</p>
                        <p className="text-[12.5px] text-slate-500">
                          PDF, Word, Excel, PowerPoint, ảnh, .zip… — tối đa {formatFileSize(mine.rules.maxFileBytes)}
                        </p>
                        {submission?.file && removeExistingFile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRemoveExistingFile(false);
                            }}
                            className="mt-1 text-[12.5px] font-semibold text-[#0f6cbf] hover:underline"
                          >
                            Giữ lại tệp cũ “{submission.file.fileName}”
                          </button>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      aria-label="Chọn tệp bài làm"
                      onChange={(e) => {
                        if (e.target.files) acceptFile(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </Field>
                </Fieldset>
              )}

              {/* ============ NÚT LƯU ============ */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
                {(errors.form || submitError) && (
                  <p className="mb-1 flex w-full items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {errors.form || submitError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {isEdit ? "Lưu bài nộp" : "Nộp bài"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void leaveTo(assignmentPath)}
                  className="rounded-lg px-5 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-200/60 disabled:opacity-60"
                >
                  Hủy
                </button>
              </div>
            </form>

            <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-slate-800">
                  <CalendarClock className="h-4 w-4 text-[#0f6cbf]" /> Thời hạn
                </p>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Hạn nộp</dt>
                    <dd className="font-semibold tabular-nums text-slate-800">{formatDateTime(assignment.dueAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Nộp trễ</dt>
                    <dd className={`font-semibold ${assignment.allowLateSubmission ? "text-emerald-700" : "text-slate-800"}`}>
                      {assignment.allowLateSubmission ? "Cho phép" : "Không"}
                    </dd>
                  </div>
                  {submission && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Lần nộp trước</dt>
                      <dd className="text-right font-semibold text-slate-800">
                        {formatDateTime(submission.submittedAt)}
                        {submission.isLate && <span className="ml-1 text-red-600">(trễ)</span>}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5">
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-amber-900">
                  <Lightbulb className="h-4 w-4" /> Gợi ý
                </p>
                <ul className="mt-2.5 space-y-2">
                  {TIPS.map((tip) => (
                    <li key={tip} className="flex gap-2 text-[12.5px] leading-relaxed text-amber-900/80">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2.5 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <p className="text-[13.5px] font-bold text-slate-800">{isEdit ? "Lưu chỉnh sửa" : "Nộp bài"}</p>
                <p className="text-[12.5px] text-slate-500">
                  {isEdit
                    ? "Bài nộp được thay thế bằng nội dung mới; thời gian nộp lấy theo thời điểm lưu."
                    : "Sau khi nộp, bạn vẫn có thể chỉnh sửa hoặc loại bỏ bài nộp trên trang bài tập."}
                </p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {isEdit ? "Lưu bài nộp" : "Nộp bài"}
                </button>
              </section>
            </aside>
          </div>
        )}
      </main>
    </CourseShell>
  );
}
