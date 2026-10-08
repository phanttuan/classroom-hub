"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  File as FileIcon,
  FileText,
  FolderOpen,
  Globe,
  HardDrive,
  ListTree,
  Loader2,
  Maximize2,
  Pencil,
} from "lucide-react";
import type { LessonDto, ResourceDto } from "@/lib/types/learning-content";
import { fetchLessonDetail, toggleLessonProgress } from "@/lib/api/learning-content-api";
import { fetchResourcePreview, triggerResourceDownload } from "@/lib/api/resource-api";
import { DISPLAY_OPTIONS, LESSON_TYPE_META, fileTypeLabel, formatFileSize } from "@/lib/lesson-types";
import { formatDate, readingMinutes, withHeadingAnchors } from "@/lib/rich-html";
import DocumentPreview from "@/components/resource/DocumentPreview";
import RichContent from "@/components/content/RichContent";
import CourseShell, { coursePathOf, useCourseContent, type CourseRole } from "./CourseShell";
import CourseHero, { HeroButton, type HeroStat } from "./CourseHero";

interface LessonViewProps {
  courseId: string;
  lessonId: string;
  role: CourseRole;
  backHref: string;
}

const isEmbeddable = (mime: string) =>
  mime === "application/pdf" || mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");

/** Thẻ trắng dùng chung cho các khối nội dung */
function Card({ title, icon: Icon, children, className = "" }: { title?: string; icon?: typeof FileText; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200/90 bg-white shadow-xs ${className}`}>
      {title && (
        <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 text-[14px] font-bold text-slate-800">
          {Icon && <Icon className="h-4 w-4 text-[#0f6cbf]" />}
          {title}
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
      <span className="w-24 shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 break-words text-[13.5px] font-medium text-slate-800">{value}</span>
    </div>
  );
}

/** Nhúng tệp trực tiếp (PDF / ảnh / video / audio) qua signed URL có hạn */
function EmbeddedFile({ resource }: { resource: ResourceDto }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchResourcePreview(resource.id)
      .then((res) => active && setUrl(res.url))
      .catch((err) => active && setError((err as Error)?.message || "Không tải được tệp"));
    return () => {
      active = false;
    };
  }, [resource.id]);

  if (error) return <p className="m-5 rounded-xl bg-amber-50 p-4 text-[13.5px] text-amber-800">{error}</p>;
  if (!url)
    return (
      <div className="grid h-[70vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#0f6cbf]" />
      </div>
    );

  const mime = resource.mimeType;
  if (mime.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element -- signed URL ngoài, không qua next/image
    return <img src={url} alt={resource.fileName} className="mx-auto max-h-[78vh] rounded-xl" />;
  }
  if (mime.startsWith("video/")) return <video src={url} controls className="w-full rounded-xl bg-black" />;
  if (mime.startsWith("audio/")) return <audio src={url} controls className="m-5 w-[calc(100%-2.5rem)]" />;
  return <iframe src={url} title={resource.fileName} className="h-[78vh] w-full rounded-xl" />;
}

function DownloadButton({ resource, compact }: { resource: ResourceDto; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await triggerResourceDownload(resource.id, resource.fileName).catch(() => {});
        setBusy(false);
      }}
      title={`Tải ${resource.fileName}`}
      className={
        compact
          ? "grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          : "flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e]"
      }
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {!compact && "Tải xuống"}
    </button>
  );
}

export default function LessonView({ courseId, lessonId, role, backHref }: LessonViewProps) {
  const router = useRouter();
  const coursePath = coursePathOf(role, courseId);
  const { course, reload } = useCourseContent(courseId);
  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ResourceDto | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLessonDetail(lessonId)
      .then((l) => {
        if (!active) return;
        // Văn bản & phương tiện không có trang riêng → về đúng vị trí trên trang khóa học
        if (l.type === "LABEL") router.replace(`${coursePath}#module-section-${l.moduleId}`);
        else setLesson(l);
      })
      .catch((err) => active && setError((err as Error)?.message || "Không tải được nội dung"));
    return () => {
      active = false;
    };
  }, [lessonId, coursePath, router]);

  const page = useMemo(() => (lesson?.type === "PAGE" ? withHeadingAnchors(lesson.content) : null), [lesson]);

  const topic = course?.modules.find((m) => m.id === lesson?.moduleId);
  const meta = lesson ? (LESSON_TYPE_META[lesson.type] ?? LESSON_TYPE_META.PAGE) : undefined;
  const settings = lesson?.settings ?? {};
  const files = lesson?.resources ?? [];

  const sequence = course?.modules.flatMap((m) => m.lessons.filter((l) => l.type !== "LABEL")) ?? [];
  const index = sequence.findIndex((l) => l.id === lessonId);
  const prev = index > 0 ? sequence[index - 1] : undefined;
  const next = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : undefined;
  const isCompleted = course?.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId)?.isCompleted ?? false;
  const hidden = lesson?.status !== "PUBLISHED";

  const toggleCompleted = async () => {
    setSavingProgress(true);
    try {
      await toggleLessonProgress(lessonId, !isCompleted);
      await reload();
    } finally {
      setSavingProgress(false);
    }
  };

  const downloadAll = async () => {
    setDownloadingAll(true);
    for (const r of files) {
      await triggerResourceDownload(r.id, r.fileName).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    setDownloadingAll(false);
  };

  // ===================== Banner =====================
  const heroStats = (): HeroStat[] => {
    if (!lesson) return [];
    const stats: HeroStat[] = [];
    if (lesson.type === "PAGE") {
      stats.push({ dot: "sky", label: `Khoảng ${readingMinutes(lesson.content)} phút đọc` });
      if (page?.headings.length) stats.push({ dot: "violet", label: `${page.headings.length} mục` });
    } else if (lesson.type === "FILE" && files[0]) {
      stats.push({ dot: "sky", label: fileTypeLabel(files[0].fileName, files[0].mimeType) || "Tệp" });
      stats.push({ dot: "amber", label: formatFileSize(files[0].fileSizeBytes) });
    } else if (lesson.type === "FOLDER") {
      const total = files.reduce((acc, f) => acc + Number(f.fileSizeBytes || 0), 0);
      stats.push({ dot: "sky", label: `${files.length} tệp` });
      if (total) stats.push({ dot: "amber", label: formatFileSize(total) });
    } else if (lesson.type === "URL" && lesson.externalUrl) {
      try {
        stats.push({ dot: "sky", label: new URL(lesson.externalUrl).hostname });
      } catch {}
    }
    const updated = formatDate(lesson.updatedAt);
    if (updated) stats.push({ dot: "slate", label: `Cập nhật ${updated}` });
    if (role === "STUDENT" && isCompleted) stats.push({ icon: Check, highlight: true, label: "Đã hoàn thành" });
    return stats;
  };

  const heroActions =
    role === "TEACHER" ? (
      <>
        <HeroButton variant="solid" href={`/teacher/content/courses/${courseId}/lessons/${lessonId}/edit`}>
          <Pencil className="h-4 w-4" /> Chỉnh sửa
        </HeroButton>
        <HeroButton href={`${coursePath}#module-section-${lesson?.moduleId ?? ""}`}>
          <ArrowLeft className="h-4 w-4" /> Về trang lớp học
        </HeroButton>
      </>
    ) : (
      <HeroButton variant={isCompleted ? "success" : "solid"} onClick={toggleCompleted} disabled={savingProgress}>
        {savingProgress ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
        {isCompleted ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
      </HeroButton>
    );

  // ===================== Nội dung theo loại =====================
  const descriptionCard = lesson?.description ? (
    <Card title="Mô tả" icon={FileText}>
      <RichContent html={lesson.description} className="px-5 py-4 !text-[14px] text-slate-600" />
    </Card>
  ) : null;

  const renderBody = () => {
    if (!lesson || !meta) return null;
    const display = settings.display ?? "AUTO";

    switch (lesson.type) {
      // ---------- TRANG: khung đọc rộng + mục lục ----------
      case "PAGE":
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <article className="rounded-2xl border border-slate-200/90 bg-white px-6 py-8 shadow-xs sm:px-10 lg:px-14 lg:py-12">
              {lesson.description && (
                <div className="mb-8 rounded-xl border-l-4 border-[#0f6cbf] bg-blue-50/60 px-5 py-4">
                  <RichContent html={lesson.description} className="!text-[14.5px] text-slate-700" />
                </div>
              )}
              <RichContent html={page?.html} className="mx-auto max-w-[920px] !text-[16px] !leading-[1.8]" />
            </article>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              {page && page.headings.length > 0 && (
                <Card title="Trong trang này" icon={ListTree}>
                  <nav className="max-h-[50vh] overflow-y-auto py-2">
                    {page.headings.map((h) => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className={`block border-l-2 border-transparent py-1.5 pr-4 text-[13px] text-slate-600 transition hover:border-[#0f6cbf] hover:bg-blue-50/50 hover:text-[#0f6cbf] ${
                          h.level === 1 ? "pl-4 font-semibold" : h.level === 2 ? "pl-4" : "pl-8"
                        }`}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </Card>
              )}
              <Card title="Thông tin" icon={FileText}>
                <div className="py-2">
                  <InfoRow icon={FileText} label="Loại" value={meta.label} />
                  <InfoRow icon={Clock} label="Thời gian đọc" value={`~${readingMinutes(lesson.content)} phút`} />
                  <InfoRow icon={CalendarDays} label="Cập nhật" value={formatDate(lesson.updatedAt) || "—"} />
                </div>
              </Card>
            </aside>
          </div>
        );

      // ---------- TỆP: khung xem trước lớn + thông tin tệp ----------
      case "FILE": {
        const file = files[0];
        if (!file) return <Card><p className="p-8 text-center text-slate-500">Chưa có tệp nào.</p></Card>;
        const embed = (display === "AUTO" || display === "EMBED") && isEmbeddable(file.mimeType);
        const showSize = settings.showSize !== false;
        const showType = settings.showType !== false;
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="overflow-hidden">
              {embed ? (
                <div className="bg-slate-50 p-2">
                  <EmbeddedFile resource={file} />
                </div>
              ) : (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  <div className="grid h-24 w-24 place-items-center rounded-3xl bg-sky-50 text-sky-600">
                    <FileIcon className="h-12 w-12" />
                  </div>
                  <p className="mt-5 max-w-lg break-words text-[18px] font-bold text-slate-900">{file.fileName}</p>
                  <p className="mt-1 text-[13.5px] text-slate-500">
                    {display === "DOWNLOAD"
                      ? "Tệp này được thiết lập để tải về máy trước khi xem."
                      : "Định dạng này không xem trực tiếp được trên trình duyệt — hãy mở bằng trình xem hoặc tải về."}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                    {display !== "DOWNLOAD" && (
                      <button
                        onClick={() => setPreview(file)}
                        className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" /> Mở trình xem
                      </button>
                    )}
                    <div className="w-44">
                      <DownloadButton resource={file} />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Card title="Thông tin tệp" icon={FileIcon}>
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="min-w-0 break-words text-[14px] font-semibold text-slate-900">{file.fileName}</p>
                </div>
                <div className="py-2">
                  {showType && <InfoRow icon={FileText} label="Định dạng" value={fileTypeLabel(file.fileName, file.mimeType)} />}
                  {showSize && <InfoRow icon={HardDrive} label="Dung lượng" value={formatFileSize(file.fileSizeBytes)} />}
                  <InfoRow icon={CalendarDays} label="Tải lên" value={formatDate(file.createdAt) || "—"} />
                </div>
                <div className="space-y-2 border-t border-slate-100 p-4">
                  <button
                    onClick={() => setPreview(file)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Maximize2 className="h-4 w-4" /> Xem toàn màn hình
                  </button>
                  <DownloadButton resource={file} />
                </div>
              </Card>
              {descriptionCard}
            </aside>
          </div>
        );
      }

      // ---------- THƯ MỤC: bảng tệp ----------
      case "FOLDER": {
        const total = files.reduce((acc, f) => acc + Number(f.fileSizeBytes || 0), 0);
        return (
          <div className="space-y-5">
            {descriptionCard}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-sky-600">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-900">Nội dung thư mục</p>
                    <p className="text-[12.5px] text-slate-500">
                      {files.length} tệp{total ? ` · ${formatFileSize(total)}` : ""}
                    </p>
                  </div>
                </div>
                {files.length > 1 && (
                  <button
                    onClick={downloadAll}
                    disabled={downloadingAll}
                    className="flex items-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
                  >
                    {downloadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Tải tất cả
                  </button>
                )}
              </div>
              {files.length === 0 ? (
                <p className="p-10 text-center text-slate-500">Thư mục chưa có tệp nào.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Tên tệp</th>
                        <th className="px-4 py-3">Định dạng</th>
                        <th className="px-4 py-3">Dung lượng</th>
                        <th className="px-4 py-3">Ngày tải lên</th>
                        <th className="px-5 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {files.map((r) => (
                        <tr key={r.id} className="transition hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <button
                              onClick={() => setPreview(r)}
                              className="flex items-center gap-3 text-left text-[14px] font-semibold text-[#0f6cbf] hover:underline"
                            >
                              <FileText className="h-5 w-5 shrink-0 text-sky-600" />
                              <span className="break-all">{r.fileName}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-slate-600">{fileTypeLabel(r.fileName, r.mimeType)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-600">{formatFileSize(r.fileSizeBytes)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-600">{formatDate(r.createdAt)}</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setPreview(r)}
                                title="Xem"
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <DownloadButton resource={r} compact />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        );
      }

      // ---------- URL: thẻ liên kết ----------
      case "URL": {
        const url = lesson.externalUrl ?? "";
        let host = url;
        try {
          host = new URL(url).hostname;
        } catch {}
        const sameTab = display === "OPEN";
        const displayLabel = DISPLAY_OPTIONS.URL.find((o) => o.value === display)?.label ?? "Tự động";
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <Card>
                <div className="flex flex-col items-center px-6 py-14 text-center">
                  <div className="grid h-24 w-24 place-items-center rounded-3xl bg-sky-50 text-sky-600">
                    <Globe className="h-12 w-12" />
                  </div>
                  <p className="mt-5 text-[20px] font-bold text-slate-900">{host}</p>
                  <p className="mt-1 max-w-2xl break-all font-mono text-[13px] text-slate-500">{url}</p>
                  <a
                    href={url}
                    target={sameTab ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0f6cbf] px-7 py-3 text-[15px] font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-[#0c599e]"
                  >
                    Mở liên kết <ExternalLink className="h-4 w-4" />
                  </a>
                  <p className="mt-3 text-[12.5px] text-slate-400">
                    {sameTab ? "Liên kết mở ngay trong tab này" : "Liên kết mở trong tab mới"}
                  </p>
                </div>
              </Card>
              {display === "EMBED" && (
                <Card className="overflow-hidden">
                  <iframe src={url} title={lesson.title} className="h-[75vh] w-full" />
                  <p className="border-t border-slate-100 px-5 py-2.5 text-center text-[12px] text-slate-400">
                    Nếu nội dung không hiển thị, trang đích có thể chặn nhúng — hãy dùng nút &quot;Mở liên kết&quot;.
                  </p>
                </Card>
              )}
            </div>
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Card title="Thông tin liên kết" icon={Globe}>
                <div className="py-2">
                  <InfoRow icon={Globe} label="Tên miền" value={host} />
                  <InfoRow icon={ExternalLink} label="Cách mở" value={displayLabel} />
                  <InfoRow icon={CalendarDays} label="Cập nhật" value={formatDate(lesson.updatedAt) || "—"} />
                </div>
              </Card>
              {descriptionCard}
            </aside>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <CourseShell course={course} role={role} backHref={backHref} activeModuleId={lesson?.moduleId} activeLessonId={lessonId}>
      {error ? (
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        </main>
      ) : !lesson || !meta ? (
        <main className="mx-auto grid max-w-[1440px] place-items-center px-4 py-24">
          <Loader2 className="h-7 w-7 animate-spin text-[#0f6cbf]" />
        </main>
      ) : (
        <>
          <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
            <CourseHero
              eyebrow={{
                icon: meta.icon,
                primary: course?.name ?? "Lớp học",
                primaryHref: coursePath,
                secondary: topic?.title,
                secondaryHref: topic ? `${coursePath}#module-section-${topic.id}` : undefined,
              }}
              title={lesson.title}
              stats={heroStats()}
              brandTag={meta.label}
              status={
                role === "TEACHER"
                  ? { caption: "Hiển thị với sinh viên", label: hidden ? "Đang ẩn" : "Đang hiển thị", tone: hidden ? "slate" : "emerald" }
                  : { caption: "Tiến độ của bạn", label: isCompleted ? "Đã hoàn thành" : "Chưa hoàn thành", tone: isCompleted ? "emerald" : "amber" }
              }
              actions={heroActions}
            />

          </div>

          <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
            {renderBody()}

            {/* Hoạt động tiếp theo — như "Hoạt động tiếp theo" của Moodle */}
            {(prev || next) && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {prev ? (
                  <Link
                    href={`${coursePath}/lessons/${prev.id}`}
                    className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs transition hover:border-[#0f6cbf]"
                  >
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                      <ArrowLeft className="h-3.5 w-3.5" /> Hoạt động trước
                    </p>
                    <p className="mt-1 truncate text-[15px] font-semibold text-slate-800 group-hover:text-[#0f6cbf]">{prev.title}</p>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link
                    href={`${coursePath}/lessons/${next.id}`}
                    className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right shadow-xs transition hover:border-[#0f6cbf]"
                  >
                    <p className="flex items-center justify-end gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                      Hoạt động tiếp theo <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                    <p className="mt-1 truncate text-[15px] font-semibold text-slate-800 group-hover:text-[#0f6cbf]">{next.title}</p>
                  </Link>
                )}
              </div>
            )}
          </main>
        </>
      )}

      <DocumentPreview
        isOpen={!!preview}
        resourceId={preview?.id ?? null}
        initialFileName={preview?.fileName}
        initialFileSize={preview?.fileSizeBytes}
        initialMimeType={preview?.mimeType}
        onClose={() => setPreview(null)}
      />
    </CourseShell>
  );
}
