"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ChevronDown,
  ChevronRight,
  Eye,
  Lightbulb,
  PencilLine,
  RefreshCw,
  Save,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type {
  LessonDisplayMode,
  LessonDto,
  LessonPayload,
  LessonSettings,
  LessonTypeKey,
  ResourceDto,
} from "@/lib/types/learning-content";
import {
  createLesson,
  deleteLesson,
  deleteResource,
  fetchLessonDetail,
  updateLesson,
  uploadContentImage,
  uploadLessonFiles,
} from "@/lib/api/learning-content-api";
import { CHOOSER_ITEMS, DISPLAY_OPTIONS, LESSON_TYPE_META, formatFileSize } from "@/lib/lesson-types";
import RichContent from "@/components/content/RichContent";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import CourseShell, { coursePathOf, useCourseContent } from "./CourseShell";
import ActivityChooser from "./ActivityChooser";
import CourseHero, { HeroButton } from "./CourseHero";

/** Gợi ý soạn thảo theo từng loại (giống phần trợ giúp trong form của Moodle) */
const TYPE_TIPS: Record<LessonTypeKey, string[]> = {
  PAGE: [
    'Dùng Tiêu đề 1–3 để chia mục — trang xem sẽ tự tạo mục lục "Trong trang này".',
    "Dán hoặc kéo thả ảnh trực tiếp vào khung soạn thảo để tải lên.",
    "Chèn bảng, trích dẫn, khối mã hoặc video YouTube từ thanh công cụ.",
    'Bấm "Xem trước" để kiểm tra nội dung trước khi lưu.',
  ],
  FILE: [
    "Chỉ 1 tệp — chọn tệp mới sẽ thay thế tệp cũ khi lưu.",
    "PDF, ảnh, video xem trực tiếp được; Word / Excel / PowerPoint mở bằng trình xem hoặc tải về.",
    '"Bắt buộc tải xuống" phù hợp với tệp nén, mã nguồn, tệp dung lượng lớn.',
  ],
  FOLDER: [
    "Gom nhiều tệp cùng chủ đề (slide, bài tập, tài liệu đọc thêm) vào một thư mục.",
    '"Ngay trên trang khóa học" hiển thị danh sách tệp ngay dưới tên thư mục.',
    "Sinh viên có thể tải từng tệp hoặc tải tất cả.",
  ],
  URL: [
    "Dán đầy đủ đường dẫn, có thể bỏ https:// — hệ thống tự bổ sung.",
    'Bấm "Mở thử" để kiểm tra liên kết trước khi lưu.',
    'Nhiều trang (Google, Zalo, Facebook) chặn nhúng — nên chọn "Mở trong cửa sổ mới".',
  ],
  LABEL: [
    "Nội dung hiển thị trực tiếp trên trang khóa học, giữa các hoạt động.",
    "Phù hợp cho lời chào, thông báo ngắn, ảnh minh họa hoặc video giới thiệu.",
    "Nên viết ngắn gọn để trang khóa học không bị dài.",
  ],
};

/** Nút chuyển Soạn thảo / Xem trước cho nội dung HTML */
function ModeSwitch({ preview, onChange }: { preview: boolean; onChange: (preview: boolean) => void }) {
  return (
    <div className="mb-2 flex justify-end">
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[12.5px] font-semibold">
        {[
          { value: false, label: "Soạn thảo", icon: PencilLine },
          { value: true, label: "Xem trước", icon: Eye },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
              preview === o.value ? "bg-white text-[#0f6cbf] shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <o.icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PreviewBox({ html, minHeight }: { html: string; minHeight: number }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white px-6 py-5" style={{ minHeight }}>
      {html ? (
        <RichContent html={html} />
      ) : (
        <p className="text-sm italic text-slate-400">Chưa có nội dung để xem trước.</p>
      )}
    </div>
  );
}

interface LessonEditorProps {
  courseId: string;
  /** Tạo mới: topic đích + loại (chưa có loại → hiện bộ chọn) */
  sectionId?: string;
  type?: LessonTypeKey;
  /** Chỉnh sửa */
  lessonId?: string;
}

/** Nhóm trường có thể thu gọn — giống fieldset trong form của Moodle */
function Fieldset({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-6 py-4 text-left text-[16px] font-bold text-slate-900 hover:text-[#0f6cbf]"
      >
        {open ? (
          <ChevronDown className="h-5 w-5 text-[#0f6cbf]" />
        ) : (
          <ChevronRight className="h-5 w-5 text-[#0f6cbf]" />
        )}
        {title}
      </button>
      {open && <div className="space-y-5 px-6 pb-6 sm:pl-[52px]">{children}</div>}
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-[200px_1fr] lg:gap-6">
      <label className="pt-2 text-[14px] font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600" title="Bắt buộc">
            *
          </span>
        )}
      </label>
      <div className="min-w-0">
        {children}
        {hint && !error && <p className="mt-1.5 text-[12.5px] text-slate-500">{hint}</p>}
        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-[12.5px] font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-[#0f6cbf] focus:ring-[#0f6cbf]"
      />
      {label}
    </label>
  );
}

const selectClass =
  "h-10 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100";

export default function LessonEditor({ courseId, sectionId, type: typeFromQuery, lessonId }: LessonEditorProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const isEdit = Boolean(lessonId);
  const coursePath = coursePathOf("TEACHER", courseId);
  const { course } = useCourseContent(courseId);

  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [loadError, setLoadError] = useState("");
  const type: LessonTypeKey | undefined = isEdit ? lesson?.type : typeFromQuery;

  // Giá trị form
  const [moduleId, setModuleId] = useState(sectionId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [settings, setSettings] = useState<LessonSettings>({
    showDescription: false,
    display: "AUTO",
    showSize: true,
    showType: true,
    folderDisplay: "PAGE",
  });
  const [visible, setVisible] = useState(true);

  // Tệp
  const [existingFiles, setExistingFiles] = useState<ResourceDto[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | "course" | "view">(null);
  const [submitError, setSubmitError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewContent, setPreviewContent] = useState(false);

  const markDirty = () => setDirty(true);

  // Tải bài cần chỉnh sửa
  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    fetchLessonDetail(lessonId)
      .then((l) => {
        if (!active) return;
        setLesson(l);
        setModuleId(l.moduleId);
        setTitle(l.title);
        setDescription(l.description ?? "");
        setContent(l.content ?? "");
        setExternalUrl(l.externalUrl ?? "");
        setSettings((prev) => ({ ...prev, ...(l.settings ?? {}) }));
        setVisible(l.status === "PUBLISHED");
        setExistingFiles(l.resources ?? []);
      })
      .catch((err) => active && setLoadError((err as Error)?.message || "Không tải được nội dung"));
    return () => {
      active = false;
    };
  }, [lessonId]);

  // Cảnh báo khi rời trang mà chưa lưu
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const targetModuleId = moduleId || course?.modules[0]?.id || "";
  const targetModule = course?.modules.find((m) => m.id === targetModuleId);
  const meta = type ? LESSON_TYPE_META[type] : undefined;
  const backToCourse = `${coursePath}#module-section-${targetModuleId}`;

  const updateSetting = <K extends keyof LessonSettings>(key: K, value: LessonSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    setPendingFiles((prev) => (type === "FILE" ? [files[0]] : [...prev, ...files]));
    setErrors((e) => ({ ...e, files: "" }));
    markDirty();
  };

  const removeExistingFile = async (r: ResourceDto) => {
    const ok = await confirm({
      tone: "danger",
      title: "Xóa tệp này?",
      message: (
        <>
          Tệp <strong className="text-slate-800">{r.fileName}</strong> sẽ bị xóa ngay khỏi kho lưu trữ và không thể khôi
          phục.
        </>
      ),
      confirmText: "Xóa tệp",
    });
    if (!ok) return;
    try {
      await deleteResource(r.id);
      setExistingFiles((prev) => prev.filter((f) => f.id !== r.id));
    } catch (err) {
      setSubmitError((err as Error)?.message || "Xóa tệp thất bại");
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const textOf = (html: string) => html.replace(/<[^>]*>/g, "").trim();
    const hasMedia = (html: string) => /<(img|iframe|table|hr)\b/i.test(html);
    if (type !== "LABEL" && !title.trim()) next.title = "Vui lòng nhập tên";
    if ((type === "PAGE" || type === "LABEL") && !textOf(content) && !hasMedia(content)) {
      next.content = "Vui lòng nhập nội dung";
    }
    if (type === "URL") {
      if (!externalUrl.trim()) next.externalUrl = "Vui lòng nhập URL";
      else if (!/^(https?:\/\/)?[^\s/$.?#].[^\s]*$/i.test(externalUrl.trim())) next.externalUrl = "URL không hợp lệ";
    }
    if (type === "FILE" && existingFiles.length + pendingFiles.length === 0) next.files = "Vui lòng chọn một tệp";
    if (type === "FOLDER" && existingFiles.length + pendingFiles.length === 0)
      next.files = "Vui lòng thêm ít nhất một tệp";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (after: "course" | "view") => {
    if (!type || !validate()) return;
    setSaving(after);
    setSubmitError("");

    const payload: LessonPayload = {
      title: title.trim(),
      description,
      content: type === "PAGE" || type === "LABEL" ? content : undefined,
      externalUrl: type === "URL" ? externalUrl.trim() : undefined,
      settings,
      status: visible ? "PUBLISHED" : "DRAFT",
    };

    let createdId: string | null = null;
    try {
      let saved: LessonDto;
      if (isEdit && lessonId) {
        saved = await updateLesson(lessonId, payload);
      } else {
        saved = await createLesson(targetModuleId, { ...payload, type });
        createdId = saved.id;
      }
      if (pendingFiles.length) {
        await uploadLessonFiles(saved.id, pendingFiles);
      }
      setDirty(false);
      router.push(
        after === "view" ? `${coursePath}/lessons/${saved.id}` : `${coursePath}#module-section-${targetModuleId}`,
      );
    } catch (err) {
      // Tạo mới nhưng tải tệp lỗi → xóa bản ghi vừa tạo để không còn tài nguyên rỗng
      if (createdId) await deleteLesson(createdId).catch(() => {});
      setSubmitError((err as Error)?.message || "Lưu thất bại, vui lòng thử lại");
      setSaving(null);
    }
  };

  const leaveTo = async (href: string) => {
    if (
      dirty &&
      !(await confirm({
        tone: "warning",
        title: "Bỏ các thay đổi chưa lưu?",
        message: "Những gì bạn vừa soạn sẽ bị mất nếu rời trang lúc này.",
        confirmText: "Bỏ thay đổi",
        cancelText: "Tiếp tục soạn",
      }))
    )
      return;
    setDirty(false);
    router.push(href);
  };
  const handleCancel = () => leaveTo(isEdit && lessonId ? `${coursePath}/lessons/${lessonId}` : backToCourse);

  const typeInfo = type ? CHOOSER_ITEMS.find((i) => i.type === type) : undefined;

  return (
    <CourseShell
      course={course}
      role="TEACHER"
      backHref="/teacher/content/courses"
      activeModuleId={targetModuleId}
      activeLessonId={lessonId}
    >
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <CourseHero
          eyebrow={{
            icon: meta?.icon,
            primary: course?.name ?? "Khóa học",
            primaryHref: coursePath,
            secondary: targetModule?.title,
            secondaryHref: backToCourse,
          }}
          onNavigate={leaveTo}
          title={
            !type
              ? "Thêm hoạt động hoặc tài nguyên"
              : isEdit
                ? title || lesson?.title || "Chỉnh sửa"
                : `Thêm ${meta?.label ?? ""} mới`
          }
          stats={
            !type
              ? [
                  {
                    dot: "sky",
                    label: `Vào topic: ${targetModule?.title ?? "—"}`,
                  },
                  {
                    dot: "amber",
                    label: `${CHOOSER_ITEMS.filter((i) => i.type).length} loại khả dụng`,
                  },
                ]
              : [
                  { dot: "sky", label: `Topic: ${targetModule?.title ?? "—"}` },
                  { dot: "amber", label: meta?.label ?? "" },
                  dirty
                    ? { dot: "rose", label: "Có thay đổi chưa lưu" }
                    : {
                        dot: "emerald",
                        label: isEdit ? "Chưa có thay đổi" : "Bản mới",
                      },
                ]
          }
          brandTag={meta?.label ?? "Hoạt động"}
          status={{
            caption: "Chế độ",
            label: isEdit ? "Đang chỉnh sửa" : "Thêm mới",
            tone: "sky",
          }}
          actions={
            isEdit && lesson ? (
              <HeroButton href={`${coursePath}/lessons/${lesson.id}`}>
                <Eye className="h-4 w-4" /> Xem trang hiện tại
              </HeroButton>
            ) : type ? (
              <HeroButton href={`/teacher/content/courses/${courseId}/lessons/new?section=${targetModuleId}`}>
                <RefreshCw className="h-4 w-4" /> Đổi loại khác
              </HeroButton>
            ) : undefined
          }
        />

      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        {course?.status === "ARCHIVED" ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-xs">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Archive className="h-8 w-8" />
            </div>
            <p className="mt-4 text-[18px] font-bold text-slate-900">Khóa học đã lưu trữ</p>
            <p className="mt-1 max-w-md text-[14px] text-slate-500">
              Khóa học đang ở chế độ chỉ đọc nên không thể thêm hoặc chỉnh sửa nội dung. Hãy khôi phục khóa học để tiếp tục
              soạn thảo.
            </p>
            <button
              type="button"
              onClick={() => router.push(coursePath)}
              className="mt-5 rounded-xl bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e]"
            >
              Về trang khóa học
            </button>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{loadError}</div>
        ) : isEdit && !lesson ? (
          <div className="grid place-items-center rounded-2xl bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
          </div>
        ) : !type ? (
          <ActivityChooser
            onSelect={(t) =>
              router.replace(`/teacher/content/courses/${courseId}/lessons/new?section=${targetModuleId}&type=${t}`)
            }
          />
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave("course");
              }}
              className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
            >
              {/* ============ CHUNG ============ */}
              <Fieldset title="Chung">
                {type !== "LABEL" && (
                  <Field label="Tên" required error={errors.title}>
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setErrors((er) => ({ ...er, title: "" }));
                        markDirty();
                      }}
                      maxLength={255}
                      placeholder={
                        type === "URL"
                          ? "VD: Nhóm Zalo khóa học"
                          : type === "FILE"
                            ? "VD: Slide bài giảng Chương 1"
                            : "VD: Bài 1 — Giới thiệu khóa học"
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                    />
                  </Field>
                )}

                {type === "LABEL" ? (
                  <Field label="Văn bản và phương tiện" required error={errors.content}>
                    <ModeSwitch preview={previewContent} onChange={setPreviewContent} />
                    {previewContent ? (
                      <PreviewBox html={content} minHeight={260} />
                    ) : (
                      <RichTextEditor
                        value={content}
                        onChange={(html) => {
                          setContent(html);
                          setErrors((er) => ({ ...er, content: "" }));
                          markDirty();
                        }}
                        onUploadImage={(file) => uploadContentImage(courseId, file)}
                        placeholder="Nội dung sẽ hiển thị trực tiếp trên trang khóa học..."
                        minHeight={260}
                      />
                    )}
                  </Field>
                ) : (
                  <>
                    <Field label="Mô tả">
                      <RichTextEditor
                        value={description}
                        onChange={(html) => {
                          setDescription(html);
                          markDirty();
                        }}
                        placeholder="Giới thiệu ngắn (không bắt buộc)"
                        minHeight={110}
                        compact
                      />
                      <div className="mt-2.5">
                        <Checkbox
                          checked={!!settings.showDescription}
                          onChange={(v) => updateSetting("showDescription", v)}
                          label="Hiển thị mô tả trên trang khóa học"
                        />
                      </div>
                    </Field>
                  </>
                )}
              </Fieldset>

              {/* ============ NỘI DUNG THEO LOẠI ============ */}
              {type === "PAGE" && (
                <Fieldset title="Nội dung">
                  <Field label="Nội dung trang" required error={errors.content}>
                    <ModeSwitch preview={previewContent} onChange={setPreviewContent} />
                    {previewContent ? (
                      <PreviewBox html={content} minHeight={420} />
                    ) : (
                      <RichTextEditor
                        value={content}
                        onChange={(html) => {
                          setContent(html);
                          setErrors((er) => ({ ...er, content: "" }));
                          markDirty();
                        }}
                        onUploadImage={(file) => uploadContentImage(courseId, file)}
                        placeholder="Soạn nội dung bài giảng..."
                        minHeight={520}
                      />
                    )}
                  </Field>
                </Fieldset>
              )}

              {type === "URL" && (
                <Fieldset title="URL">
                  <Field
                    label="URL ngoài"
                    required
                    error={errors.externalUrl}
                    hint="Đường dẫn tới trang web, tài liệu online, nhóm Zalo, phòng họp…"
                  >
                    <div className="flex gap-2">
                      <input
                        value={externalUrl}
                        onChange={(e) => {
                          setExternalUrl(e.target.value);
                          setErrors((er) => ({ ...er, externalUrl: "" }));
                          markDirty();
                        }}
                        placeholder="https://..."
                        className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                      />
                      <a
                        href={/^https?:\/\//i.test(externalUrl) ? externalUrl : `https://${externalUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!externalUrl.trim()}
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 ${
                          externalUrl.trim() ? "" : "pointer-events-none opacity-50"
                        }`}
                      >
                        <ExternalLink className="h-4 w-4" /> Mở thử
                      </a>
                    </div>
                  </Field>
                </Fieldset>
              )}

              {(type === "FILE" || type === "FOLDER") && (
                <Fieldset title={type === "FILE" ? "Chọn tệp" : "Nội dung thư mục"}>
                  <Field
                    label={type === "FILE" ? "Tệp" : "Các tệp"}
                    required
                    error={errors.files}
                    hint={
                      type === "FILE"
                        ? "Chỉ 1 tệp — chọn tệp mới sẽ thay thế tệp hiện tại khi lưu."
                        : "Có thể chọn nhiều tệp cùng lúc."
                    }
                  >
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        addFiles(e.dataTransfer.files);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                        dragOver
                          ? "border-[#0f6cbf] bg-blue-50"
                          : "border-slate-300 bg-slate-50/50 hover:border-[#0f6cbf] hover:bg-blue-50/40"
                      }`}
                    >
                      <UploadCloud className="h-9 w-9 text-[#0f6cbf]" />
                      <p className="mt-2 text-[14px] font-semibold text-slate-800">
                        Kéo thả tệp vào đây hoặc bấm để chọn
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-slate-500">
                        PDF, Word, Excel, PowerPoint, ảnh, video, ZIP…
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        multiple={type === "FOLDER"}
                        onChange={(e) => {
                          if (e.target.files) addFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {(existingFiles.length > 0 || pendingFiles.length > 0) && (
                      <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                        {existingFiles.map((r) => {
                          const replaced = type === "FILE" && pendingFiles.length > 0;
                          return (
                            <li
                              key={r.id}
                              className={`flex items-center gap-3 px-4 py-2.5 ${replaced ? "opacity-50" : ""}`}
                            >
                              <FileText className="h-5 w-5 shrink-0 text-sky-600" />
                              <span
                                className={`min-w-0 flex-1 truncate text-[13.5px] ${replaced ? "line-through" : ""}`}
                              >
                                {r.fileName}
                              </span>
                              <span className="text-[12px] text-slate-400">{formatFileSize(r.fileSizeBytes)}</span>
                              {replaced ? (
                                <span className="text-[11.5px] text-amber-600">Sẽ được thay thế</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removeExistingFile(r)}
                                  aria-label={`Xóa ${r.fileName}`}
                                  className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </li>
                          );
                        })}
                        {pendingFiles.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="flex items-center gap-3 bg-blue-50/40 px-4 py-2.5">
                            <FileText className="h-5 w-5 shrink-0 text-[#0f6cbf]" />
                            <span className="min-w-0 flex-1 truncate text-[13.5px]">{f.name}</span>
                            <span className="text-[12px] text-slate-400">{formatFileSize(f.size)}</span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              Mới
                            </span>
                            <button
                              type="button"
                              onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                              aria-label={`Bỏ ${f.name}`}
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Field>
                </Fieldset>
              )}

              {/* ============ GIAO DIỆN ============ */}
              {(type === "FILE" || type === "URL") && (
                <Fieldset title="Giao diện" defaultOpen={false}>
                  <Field
                    label="Hiển thị"
                    hint="Cách sinh viên mở tài nguyên. 'Tự động' chọn cách phù hợp theo loại tệp / trang."
                  >
                    <select
                      value={settings.display ?? "AUTO"}
                      onChange={(e) => updateSetting("display", e.target.value as LessonDisplayMode)}
                      className={selectClass}
                    >
                      {DISPLAY_OPTIONS[type].map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {type === "FILE" && (
                    <Field label="Thông tin tệp">
                      <div className="space-y-2 pt-2">
                        <Checkbox
                          checked={settings.showSize !== false}
                          onChange={(v) => updateSetting("showSize", v)}
                          label="Hiển thị kích thước"
                        />
                        <Checkbox
                          checked={settings.showType !== false}
                          onChange={(v) => updateSetting("showType", v)}
                          label="Hiển thị loại tệp"
                        />
                      </div>
                    </Field>
                  )}
                </Fieldset>
              )}
              {type === "FOLDER" && (
                <Fieldset title="Giao diện" defaultOpen={false}>
                  <Field label="Hiển thị nội dung thư mục">
                    <select
                      value={settings.folderDisplay ?? "PAGE"}
                      onChange={(e) => updateSetting("folderDisplay", e.target.value as "PAGE" | "INLINE")}
                      className={selectClass}
                    >
                      <option value="PAGE">Trên một trang riêng</option>
                      <option value="INLINE">Ngay trên trang khóa học</option>
                    </select>
                  </Field>
                </Fieldset>
              )}

              {/* ============ CÀI ĐẶT CHUNG ============ */}
              <Fieldset title="Cài đặt chung">
                <Field label="Khả năng hiển thị">
                  <select
                    value={visible ? "show" : "hide"}
                    onChange={(e) => {
                      setVisible(e.target.value === "show");
                      markDirty();
                    }}
                    className={selectClass}
                  >
                    <option value="show">Hiện với sinh viên</option>
                    <option value="hide">Ẩn với sinh viên</option>
                  </select>
                </Field>
                {!isEdit && course && (
                  <Field label="Topic">
                    <select
                      value={targetModuleId}
                      onChange={(e) => setModuleId(e.target.value)}
                      className={selectClass}
                    >
                      {course.modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </Fieldset>

              {/* ============ NÚT LƯU ============ */}
              <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
                {submitError && (
                  <p className="mb-1 flex w-full items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!!saving}
                  className="flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e] disabled:opacity-60"
                >
                  {saving === "course" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu và quay lại khóa học
                </button>
                {type !== "LABEL" && (
                  <button
                    type="button"
                    disabled={!!saving}
                    onClick={() => handleSave("view")}
                    className="flex items-center gap-2 rounded-lg border border-[#0f6cbf] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#0f6cbf] hover:bg-blue-50 disabled:opacity-60"
                  >
                    {saving === "view" && <Loader2 className="h-4 w-4 animate-spin" />}
                    Lưu và hiển thị
                  </button>
                )}
                <button
                  type="button"
                  disabled={!!saving}
                  onClick={handleCancel}
                  className="rounded-lg px-5 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-200/60 disabled:opacity-60"
                >
                  Hủy
                </button>
                {saving && pendingFiles.length > 0 && (
                  <span className="text-[12.5px] text-slate-500">Đang tải {pendingFiles.length} tệp lên…</span>
                )}
              </div>
            </form>

            {/* Cột phải: loại, gợi ý, lưu nhanh */}
            <aside className="space-y-4 xl:sticky xl:top-20">
              {typeInfo && (
                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${typeInfo.iconClass}`}>
                      <typeInfo.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tài nguyên</p>
                      <p className="text-[16px] font-bold text-slate-900">{typeInfo.label}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{typeInfo.summary}</p>
                </section>
              )}

              {type && (
                <section className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5">
                  <p className="flex items-center gap-2 text-[13.5px] font-bold text-amber-900">
                    <Lightbulb className="h-4 w-4" /> Gợi ý
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {TYPE_TIPS[type].map((tip) => (
                      <li key={tip} className="flex gap-2 text-[12.5px] leading-relaxed text-amber-900/80">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="space-y-2.5 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <p className="text-[13.5px] font-bold text-slate-800">Lưu thay đổi</p>
                <p className="text-[12.5px] text-slate-500">
                  {visible ? "Sinh viên sẽ thấy mục này ngay sau khi lưu." : "Mục này đang ẩn với sinh viên."}
                </p>
                <button
                  type="button"
                  disabled={!!saving}
                  onClick={() => handleSave("course")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
                >
                  {saving === "course" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu và quay lại khóa học
                </button>
                {type !== "LABEL" && (
                  <button
                    type="button"
                    disabled={!!saving}
                    onClick={() => handleSave("view")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-[#0f6cbf] hover:bg-blue-50 disabled:opacity-60"
                  >
                    {saving === "view" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Lưu và hiển thị
                  </button>
                )}
                {submitError && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {submitError}
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}
      </main>
    </CourseShell>
  );
}
