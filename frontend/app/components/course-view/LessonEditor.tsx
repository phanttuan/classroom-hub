"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Eye,
  EyeOff,
  FilePen,
  Lightbulb,
  ListChecks,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
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
  uploadContentAttachment,
  uploadContentImage,
  uploadLessonFiles,
} from "@/lib/api/learning-content-api";
import {
  createAssignment,
  fetchAssignmentDetail,
  formatAssignmentApiError,
  publishAssignment,
  updateAssignment,
} from "@/lib/api/assignment-api";
import {
  addQuizQuestion,
  createQuestionBankQuestion,
  createQuiz,
  fetchQuestionBank,
  fetchQuestionSets,
  fetchQuizDetail,
  formatQuizApiError,
  publishQuiz,
  removeQuizQuestion,
  updateQuiz,
  updateQuizQuestion,
} from "@/lib/api/quiz-api";
import type {
  QuestionBankQuestionDto,
  QuestionSetDto,
  QuestionTypeKey,
  QuizQuestionDto,
  QuizStatus,
} from "@/lib/types/quiz";
import {
  CHOOSER_ITEMS,
  DISPLAY_OPTIONS,
  LESSON_TYPE_META,
  formatFileSize,
  type ChooserItem,
} from "@/lib/lesson-types";
import RichContent from "@/components/content/RichContent";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { Checkbox, Field, Fieldset } from "./form-controls";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/app/components/common/Toast";
import CourseShell, { coursePathOf, useCourseContent } from "./CourseShell";
import ActivityChooser from "./ActivityChooser";
import CourseHero, { HeroButton } from "./CourseHero";

export type EditorActivityType = LessonTypeKey | "ASSIGNMENT" | "QUIZ";

const ASSIGNMENT_ITEM: ChooserItem = {
  key: "assign",
  type: null,
  category: "activity",
  label: "Bài tập",
  summary:
    "Giao bài, nhận bài nộp của sinh viên dưới dạng tệp hoặc trực tuyến, chấm điểm và gửi phản hồi.",
  icon: ClipboardList,
  iconClass: "bg-pink-50 text-pink-600",
};

const QUIZ_ITEM: ChooserItem = {
  key: "quiz",
  type: null,
  category: "activity",
  label: "Đề kiểm tra",
  summary:
    "Bài kiểm tra trắc nghiệm có thời gian, chấm điểm tự động và đồng bộ vào sổ điểm.",
  icon: CheckSquare,
  iconClass: "bg-pink-50 text-pink-600",
};

/** Câu hỏi đang nằm trong đề (đã lưu trên máy chủ hoặc vừa chọn từ ngân hàng) */
interface ChosenQuizQuestion {
  quizQuestionId?: string;
  questionId: string;
  content: string;
  questionType: QuestionTypeKey;
  choices: Array<{ content: string; isCorrect: boolean }>;
  maxScore: string;
}

function toDatetimeLocalValue(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultOpenAtLocal(): string {
  return toDatetimeLocalValue(new Date().toISOString());
}

function defaultDueAtLocal(): string {
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  due.setHours(23, 59, 0, 0);
  return toDatetimeLocalValue(due.toISOString());
}

/** Gợi ý soạn thảo theo từng loại (giống phần trợ giúp trong form của Moodle) */
const TYPE_TIPS: Record<EditorActivityType, string[]> = {
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
  ASSIGNMENT: [
    "Hạn nộp bài phải sau thời gian mở bài tập.",
    "Điểm tối đa mặc định là 10. Điểm này sẽ tự động được đưa vào Sổ điểm (Gradebook) của khóa học.",
    "Chọn hình thức nộp: bài làm văn bản, tệp đính kèm hoặc cả hai. Mỗi sinh viên nộp tối đa 1 tệp — nhiều tệp thì nén .zip.",
    "Bật “Cho phép nộp bài sau hạn” nếu muốn nhận bài trễ; bài nộp sau hạn luôn được đánh dấu “Nộp trễ”.",
    "Chọn 'Lưu bản nháp' nếu bài tập chưa sẵn sàng hiển thị cho sinh viên.",
    "Bài tập đã xuất bản vẫn chỉnh sửa được (gia hạn, bật nộp trễ, đổi hình thức nộp…); chỉ bài tập đã đóng mới bị khóa.",
  ],
  QUIZ: [
    "Đề kiểm tra phải có ít nhất một câu hỏi trước khi xuất bản.",
    "Câu hỏi được sao lưu (snapshot) tại thời điểm thêm vào đề — sửa ngân hàng sau đó không làm thay đổi đề đã tạo.",
    "Chỉ đề ở trạng thái nháp (DRAFT) mới được sửa câu hỏi, đổi topic hoặc xóa.",
    "Khi xuất bản, tổng điểm các câu hỏi được chốt vào sổ điểm nếu bật chấm điểm.",
    "Tắt chấm điểm với bài khảo sát/luyện tập — hệ thống sẽ không tạo cột điểm.",
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
  type?: EditorActivityType;
  /** Chỉnh sửa */
  lessonId?: string;
  assignmentId?: string;
  quizId?: string;
}

const selectClass =
  "h-10 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100";

export default function LessonEditor({
  courseId,
  sectionId,
  type: typeFromQuery,
  lessonId,
  assignmentId,
  quizId,
}: LessonEditorProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const isQuiz = typeFromQuery === "QUIZ" || Boolean(quizId);
  const isAssignment =
    typeFromQuery === "ASSIGNMENT" || Boolean(assignmentId);
  const isEdit = Boolean(lessonId) || Boolean(assignmentId) || Boolean(quizId);
  const coursePath = coursePathOf("TEACHER", courseId);
  const { course } = useCourseContent(courseId);

  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [loadError, setLoadError] = useState("");
  const type: EditorActivityType | undefined = isQuiz
    ? "QUIZ"
    : isAssignment
      ? "ASSIGNMENT"
      : isEdit
        ? lesson?.type
        : typeFromQuery;

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

  // Trường riêng cho Bài tập
  const [maxScore, setMaxScore] = useState<string>("10");
  const [openAt, setOpenAt] = useState<string>(() => defaultOpenAtLocal());
  const [dueAt, setDueAt] = useState<string>(() => defaultDueAtLocal());
  // Tùy chọn nộp bài (giống "Submission types" / "Cut-off" của Moodle)
  const [allowTextSubmission, setAllowTextSubmission] = useState(true);
  const [allowFileSubmission, setAllowFileSubmission] = useState(true);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  // Trạng thái bài tập đang chỉnh sửa — bài đã xuất bản thì nhắc rằng thay đổi có hiệu lực ngay với sinh viên
  const [assignmentStatus, setAssignmentStatus] = useState<"DRAFT" | "PUBLISHED" | "CLOSED" | null>(null);

  // Trường riêng cho Đề kiểm tra
  const [quizStatus, setQuizStatus] = useState<QuizStatus | null>(null);
  const [quizInstructions, setQuizInstructions] = useState("");
  const [quizDuration, setQuizDuration] = useState("45");
  const [quizMaxAttempts, setQuizMaxAttempts] = useState("1");
  const [quizScoring, setQuizScoring] = useState(true);
  const [quizShowAnswers, setQuizShowAnswers] = useState(false);
  const [quizTab, setQuizTab] = useState<"config" | "questions">("config");
  const [chosenQuestions, setChosenQuestions] = useState<ChosenQuizQuestion[]>([]);
  const [removedQuizQuestionIds, setRemovedQuizQuestionIds] = useState<string[]>([]);
  const [bankQuestions, setBankQuestions] = useState<QuestionBankQuestionDto[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [bankSets, setBankSets] = useState<QuestionSetDto[]>([]);
  const [bankSetFilter, setBankSetFilter] = useState("all");
  const [newQuestionOpen, setNewQuestionOpen] = useState(false);
  const [newQuestionContent, setNewQuestionContent] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<QuestionTypeKey>("SINGLE");
  const [newQuestionScore, setNewQuestionScore] = useState("1");
  const [newQuestionSetId, setNewQuestionSetId] = useState("");
  const [newQuestionChoices, setNewQuestionChoices] = useState([
    { content: "", isCorrect: true },
    { content: "", isCorrect: false },
  ]);
  const [newQuestionError, setNewQuestionError] = useState("");
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  const changeNewQuestionType = (next: QuestionTypeKey) => {
    setNewQuestionType(next);
    if (next === "SINGLE") {
      setNewQuestionChoices((prev) => {
        const firstCorrect = prev.findIndex((choice) => choice.isCorrect);
        const keep = firstCorrect >= 0 ? firstCorrect : 0;
        return prev.map((choice, index) => ({
          ...choice,
          isCorrect: index === keep,
        }));
      });
    }
  };

  const toggleNewQuestionCorrect = (index: number) => {
    setNewQuestionChoices((prev) =>
      prev.map((choice, choiceIndex) => {
        if (newQuestionType === "SINGLE") {
          return { ...choice, isCorrect: choiceIndex === index };
        }
        return choiceIndex === index
          ? { ...choice, isCorrect: !choice.isCorrect }
          : choice;
      }),
    );
  };

  // Tệp
  const [existingFiles, setExistingFiles] = useState<ResourceDto[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | "course" | "draft">(null);
  const [submitError, setSubmitError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewContent, setPreviewContent] = useState(false);

  const markDirty = () => setDirty(true);

  // Tải bài học cần chỉnh sửa
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

  // Tải bài tập cần chỉnh sửa
  useEffect(() => {
    if (!assignmentId) return;
    let active = true;
    fetchAssignmentDetail(courseId, assignmentId)
      .then((a) => {
        if (!active) return;
        setModuleId(a.moduleId);
        setTitle(a.title);
        setDescription(a.description ?? "");
        setMaxScore(String(Number(a.maxScore) || a.maxScore));
        setOpenAt(toDatetimeLocalValue(a.openAt));
        setDueAt(toDatetimeLocalValue(a.dueAt));
        setAllowTextSubmission(a.allowTextSubmission ?? true);
        setAllowFileSubmission(a.allowFileSubmission ?? true);
        setAllowLateSubmission(a.allowLateSubmission ?? false);
        setAssignmentStatus(a.status);
        setVisible(a.status === "PUBLISHED");
      })
      .catch((err) => active && setLoadError((err as Error)?.message || "Không tải được thông tin bài tập"));
    return () => {
      active = false;
    };
  }, [courseId, assignmentId]);

  // Tải đề kiểm tra cần chỉnh sửa
  useEffect(() => {
    if (!quizId) return;
    let active = true;
    fetchQuizDetail(courseId, quizId)
      .then((quiz) => {
        if (!active) return;
        setModuleId(quiz.moduleId);
        setTitle(quiz.title);
        setQuizInstructions(quiz.instructions ?? "");
        setOpenAt(toDatetimeLocalValue(quiz.openAt));
        setDueAt(toDatetimeLocalValue(quiz.dueAt));
        setQuizDuration(quiz.durationMinutes ? String(quiz.durationMinutes) : "");
        setQuizMaxAttempts(String(quiz.maxAttempts ?? 1));
        setQuizScoring(quiz.scoringEnabled);
        setQuizShowAnswers(quiz.showAnswersAfterSubmit);
        setQuizStatus(quiz.status);
        setVisible(quiz.status === "PUBLISHED");
        setChosenQuestions(
          (quiz.questions ?? []).map((question: QuizQuestionDto) => ({
            quizQuestionId: question.id,
            questionId: question.questionId,
            content: question.questionSnapshot.content,
            questionType: question.questionSnapshot.questionType,
            choices: (question.questionSnapshot.choices ?? []).map((choice) => ({
              content: choice.content,
              isCorrect: choice.isCorrect,
            })),
            maxScore: String(Number(question.maxScore) || question.maxScore),
          })),
        );
      })
      .catch((err) =>
        active &&
        setLoadError((err as Error)?.message || "Không tải được thông tin đề kiểm tra"),
      );
    return () => {
      active = false;
    };
  }, [courseId, quizId]);

  // Tải ngân hàng câu hỏi khi mở tab câu hỏi của đề kiểm tra
  useEffect(() => {
    if (!isQuiz || bankLoaded || quizTab !== "questions") return;
    let active = true;
    // Đẩy setState sang microtask để không tạo render dây chuyền ngay trong effect
    void Promise.resolve().then(() => {
      if (active) setBankLoading(true);
    });
    Promise.all([fetchQuestionBank(), fetchQuestionSets()])
      .then(([questions, sets]) => {
        if (!active) return;
        setBankQuestions(questions);
        setBankSets(sets);
        setBankLoaded(true);
      })
      .catch((err) => {
        if (!active) return;
        setSubmitError(formatQuizApiError(err, "Không tải được ngân hàng câu hỏi"));
      })
      .finally(() => active && setBankLoading(false));
    return () => {
      active = false;
    };
  }, [isQuiz, bankLoaded, quizTab]);

  // Cảnh báo khi rời trang mà chưa lưu
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const targetModuleId = moduleId || course?.modules[0]?.id || "";
  const targetModule = course?.modules.find((m) => m.id === targetModuleId);
  const meta =
    type === "ASSIGNMENT"
      ? ASSIGNMENT_ITEM
      : type === "QUIZ"
        ? QUIZ_ITEM
        : type
          ? LESSON_TYPE_META[type]
          : undefined;
  const backToCourse = `${coursePath}#module-section-${targetModuleId}`;
  const quizLocked = isQuiz && quizStatus !== null && quizStatus !== "DRAFT";
  const quizEditDraft = isEdit && isQuiz && quizStatus === "DRAFT";
  const quizScoreTotal = chosenQuestions.reduce((sum, question) => {
    const score = Number(question.maxScore);
    return sum + (Number.isFinite(score) ? score : 0);
  }, 0);
  const filteredBankQuestions = bankQuestions.filter((question) => {
    if (
      bankSetFilter !== "all" &&
      (bankSetFilter === "unfiled"
        ? question.setId !== null
        : question.setId !== bankSetFilter)
    ) {
      return false;
    }
    const keyword = bankSearch.trim().toLowerCase();
    if (!keyword) return true;
    return question.content.toLowerCase().includes(keyword);
  });

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

  const handleSaveAssignment = async (mode: "course" | "draft") => {
    setSubmitError("");
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "Vui lòng nhập tên bài tập";
    else if (title.trim().length > 255) nextErrors.title = "Tên bài tập không được vượt quá 255 ký tự";

    const parsedScore = Number(maxScore.trim());
    if (!Number.isFinite(parsedScore) || parsedScore < 0.01) {
      nextErrors.maxScore = "Điểm tối đa phải là số lớn hơn hoặc bằng 0.01";
    }

    const openDate = new Date(openAt);
    const dueDate = new Date(dueAt);
    if (Number.isNaN(openDate.getTime())) {
      nextErrors.openAt = "Vui lòng chọn thời gian mở bài tập";
    }
    if (Number.isNaN(dueDate.getTime())) {
      nextErrors.dueAt = "Vui lòng chọn hạn nộp bài tập";
    }
    if (!Number.isNaN(openDate.getTime()) && !Number.isNaN(dueDate.getTime()) && dueDate <= openDate) {
      nextErrors.dueAt = "Hạn nộp phải sau thời gian mở bài tập";
    }
    if (!allowTextSubmission && !allowFileSubmission) {
      nextErrors.submissionTypes = "Phải cho phép ít nhất một hình thức nộp bài";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const targetMod = moduleId || targetModuleId;
    if (!targetMod) {
      setSubmitError("Vui lòng chọn topic cho bài tập");
      return;
    }

    const payload = {
      moduleId: targetMod,
      title: title.trim(),
      description: description.trim() || undefined,
      maxScore: parsedScore,
      openAt: openDate.toISOString(),
      dueAt: dueDate.toISOString(),
      allowTextSubmission,
      allowFileSubmission,
      allowLateSubmission,
    };

    setSaving(mode);
    try {
      if (assignmentId) {
        await updateAssignment(courseId, assignmentId, payload);
        toast.success("Đã cập nhật bài tập", "Thay đổi có hiệu lực ngay với sinh viên trong khóa học.");
      } else {
        const created = await createAssignment(courseId, payload);
        if (mode === "course") {
          await publishAssignment(courseId, created.id);
          toast.success("Đã tạo và xuất bản bài tập", "Sinh viên có thể xem và nộp bài khi đến thời gian mở.");
        } else {
          toast.success("Đã lưu bản nháp bài tập", "Bài tập đang ẩn với sinh viên cho đến khi bạn xuất bản.");
        }
      }
      setDirty(false);
      router.push(`${coursePath}#module-section-${targetMod}`);
    } catch (err) {
      setSubmitError(formatAssignmentApiError(err, "Không thể lưu bài tập"));
    } finally {
      setSaving(null);
    }
  };

  /**
   * course: lưu theo "Khả năng hiển thị" rồi quay về khóa học.
   * draft : lưu ở trạng thái ẩn với sinh viên rồi quay về khóa học.
   */
  const toggleBankQuestion = (question: QuestionBankQuestionDto) => {
    const alreadyChosen = chosenQuestions.find((q) => q.questionId === question.id);
    if (alreadyChosen) {
      setChosenQuestions((prev) => prev.filter((q) => q.questionId !== question.id));
      if (alreadyChosen.quizQuestionId) {
        setRemovedQuizQuestionIds((prev) => [...prev, alreadyChosen.quizQuestionId!]);
      }
      markDirty();
      return;
    }
    setChosenQuestions((prev) => [
      ...prev,
      {
        questionId: question.id,
        content: question.content,
        questionType: question.questionType,
        choices: question.choices.map((choice) => ({
          content: choice.content,
          isCorrect: choice.isCorrect,
        })),
        maxScore: String(Number(question.defaultScore) || question.defaultScore),
      },
    ]);
    markDirty();
  };

  const updateChosenScore = (questionId: string, value: string) => {
    setChosenQuestions((prev) =>
      prev.map((q) => (q.questionId === questionId ? { ...q, maxScore: value } : q)),
    );
    markDirty();
  };

  const removeChosenQuestion = (question: ChosenQuizQuestion) => {
    setChosenQuestions((prev) => prev.filter((q) => q.questionId !== question.questionId));
    if (question.quizQuestionId) {
      setRemovedQuizQuestionIds((prev) => [...prev, question.quizQuestionId!]);
    }
    markDirty();
  };

  const createBankQuestion = async () => {
    setNewQuestionError("");
    const trimmedContent = newQuestionContent.trim();
    if (!trimmedContent) {
      setNewQuestionError("Nội dung câu hỏi không được để trống.");
      return;
    }
    if (newQuestionChoices.length < 2) {
      setNewQuestionError("Câu hỏi phải có ít nhất 2 lựa chọn.");
      return;
    }
    const choices = newQuestionChoices.map((choice) => ({
      content: choice.content.trim(),
      isCorrect: choice.isCorrect,
    }));
    if (choices.some((c) => !c.content)) {
      setNewQuestionError("Nội dung lựa chọn không được để trống.");
      return;
    }
    const correctCount = choices.filter((choice) => choice.isCorrect).length;
    if (correctCount === 0) {
      setNewQuestionError("Câu hỏi phải có ít nhất một lựa chọn đúng.");
      return;
    }
    if (newQuestionType === "SINGLE" && correctCount !== 1) {
      setNewQuestionError("Câu hỏi một đáp án chỉ được có đúng một lựa chọn đúng.");
      return;
    }
    if (newQuestionType === "MULTIPLE" && correctCount < 2) {
      setNewQuestionError("Câu hỏi nhiều đáp án phải có ít nhất hai lựa chọn đúng.");
      return;
    }
    const score = Number(newQuestionScore);
    if (!Number.isFinite(score) || score < 0.01) {
      setNewQuestionError("Điểm mặc định phải là số lớn hơn hoặc bằng 0.01.");
      return;
    }

    setCreatingQuestion(true);
    try {
      const targetSetId = newQuestionSetId ? newQuestionSetId : undefined;
      const created = await createQuestionBankQuestion({
        content: trimmedContent,
        questionType: newQuestionType,
        defaultScore: score,
        ...(targetSetId ? { setId: targetSetId } : {}),
        choices,
      });
      setBankQuestions((prev) => [created, ...prev]);
      if (targetSetId) {
        setBankSets((prev) =>
          prev.map((s) =>
            s.id === targetSetId
              ? { ...s, questionCount: s.questionCount + 1 }
              : s
          )
        );
      }
      setChosenQuestions((prev) => [
        ...prev,
        {
          questionId: created.id,
          content: created.content,
          questionType: created.questionType,
          choices: created.choices.map((choice) => ({
            content: choice.content,
            isCorrect: choice.isCorrect,
          })),
          maxScore: String(score),
        },
      ]);
      setNewQuestionContent("");
      setNewQuestionType("SINGLE");
      setNewQuestionScore("1");
      setNewQuestionSetId("");
      setNewQuestionChoices([
        { content: "", isCorrect: true },
        { content: "", isCorrect: false },
      ]);
      setNewQuestionOpen(false);
      markDirty();
    } catch (err) {
      setNewQuestionError(formatQuizApiError(err, "Không tạo được câu hỏi."));
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleSaveQuiz = async (mode: "course" | "draft") => {
    setSubmitError("");
    if (quizLocked) {
      setSubmitError("Đề kiểm tra đã xuất bản/đóng nên không thể chỉnh sửa.");
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "Vui lòng nhập tên đề kiểm tra";
    else if (title.trim().length > 255) {
      nextErrors.title = "Tên đề kiểm tra không được vượt quá 255 ký tự";
    }

    const openDate = new Date(openAt);
    const dueDate = new Date(dueAt);
    if (Number.isNaN(openDate.getTime())) {
      nextErrors.openAt = "Vui lòng chọn thời gian mở đề";
    }
    if (Number.isNaN(dueDate.getTime())) {
      nextErrors.dueAt = "Vui lòng chọn hạn đóng đề";
    }
    if (
      !Number.isNaN(openDate.getTime()) &&
      !Number.isNaN(dueDate.getTime()) &&
      dueDate <= openDate
    ) {
      nextErrors.dueAt = "Hạn đóng phải sau thời gian mở đề";
    }

    const duration = quizDuration.trim() ? Number(quizDuration) : undefined;
    if (duration !== undefined && (!Number.isInteger(duration) || duration < 1)) {
      nextErrors.duration = "Thời lượng làm bài phải là số nguyên dương (phút)";
    }
    const attempts = Number(quizMaxAttempts);
    if (!Number.isInteger(attempts) || attempts < 1) {
      nextErrors.maxAttempts = "Số lần làm tối đa phải là số nguyên dương";
    }

    const invalidScore = chosenQuestions.find((q) => {
      const score = Number(q.maxScore);
      return !Number.isFinite(score) || score < 0.01;
    });
    if (invalidScore) {
      nextErrors.scores = "Điểm của mỗi câu hỏi phải là số lớn hơn hoặc bằng 0.01";
    }
    if (mode === "course" && chosenQuestions.length === 0) {
      nextErrors.questions = "Đề kiểm tra phải có ít nhất một câu hỏi trước khi xuất bản";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.questions || nextErrors.scores) setQuizTab("questions");
      return;
    }

    const targetMod = moduleId || targetModuleId;
    if (!targetMod) {
      setSubmitError("Vui lòng chọn topic cho đề kiểm tra");
      return;
    }

    const payload = {
      moduleId: targetMod,
      title: title.trim(),
      instructions: quizInstructions.trim(),
      openAt: openDate.toISOString(),
      dueAt: dueDate.toISOString(),
      durationMinutes: duration,
      maxAttempts: attempts,
      scoringEnabled: quizScoring,
      showAnswersAfterSubmit: quizShowAnswers,
    };

    setSaving(mode);
    try {
      let savedQuizId = quizId;
      if (savedQuizId) {
        await updateQuiz(courseId, savedQuizId, payload);
      } else {
        const created = await createQuiz(courseId, payload);
        savedQuizId = created.id;
      }

      for (const removedId of removedQuizQuestionIds) {
        await removeQuizQuestion(courseId, savedQuizId, removedId);
      }

      for (const question of chosenQuestions) {
        if (!question.quizQuestionId) {
          await addQuizQuestion(courseId, savedQuizId, {
            questionId: question.questionId,
            maxScore: Number(question.maxScore),
          });
        } else {
          await updateQuizQuestion(
            courseId,
            savedQuizId,
            question.quizQuestionId,
            Number(question.maxScore),
          );
        }
      }

      if (mode === "course") {
        await publishQuiz(courseId, savedQuizId);
        toast.success("Đã tạo và xuất bản đề kiểm tra", "Tổng điểm đã được chốt vào sổ điểm.");
      } else {
        toast.success("Đã lưu bản nháp đề kiểm tra", "Đề đang ẩn với sinh viên cho đến khi bạn xuất bản.");
      }

      setDirty(false);
      router.push(`${coursePath}#module-section-${targetMod}`);
    } catch (err) {
      setSubmitError(formatQuizApiError(err, "Không thể lưu đề kiểm tra"));
    } finally {
      setSaving(null);
    }
  };

  const handleSave = async (mode: "course" | "draft") => {
    if (!type || type === "ASSIGNMENT" || type === "QUIZ" || !validate()) return;

    // Hệ thống không giữ song song bản công khai + bản nháp → lưu nháp sẽ ẩn mục đang hiển thị
    if (mode === "draft" && isEdit && lesson?.status === "PUBLISHED") {
      const ok = await confirm({
        tone: "warning",
        icon: EyeOff,
        title: "Chuyển mục này về bản nháp?",
        message: "Mục đang hiển thị với sinh viên. Lưu bản nháp sẽ ẩn mục khỏi sinh viên cho đến khi bạn công bố lại.",
        confirmText: "Lưu bản nháp",
        cancelText: "Giữ hiển thị",
      });
      if (!ok) return;
    }

    setSaving(mode);
    setSubmitError("");

    const payload: LessonPayload = {
      title: title.trim(),
      description,
      content: type === "PAGE" || type === "LABEL" ? content : undefined,
      externalUrl: type === "URL" ? externalUrl.trim() : undefined,
      settings,
      status: mode === "draft" ? "DRAFT" : visible ? "PUBLISHED" : "DRAFT",
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

      if (mode === "draft") {
        toast.success("Đã lưu bản nháp", "Mục đang ẩn với sinh viên cho đến khi bạn công bố.");
      }
      router.push(`${coursePath}#module-section-${targetModuleId}`);
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

  const typeInfo =
    type === "ASSIGNMENT"
      ? ASSIGNMENT_ITEM
      : type === "QUIZ"
        ? QUIZ_ITEM
        : type
          ? CHOOSER_ITEMS.find((i) => i.type === type)
          : undefined;

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
                ? title || (isAssignment ? "Chỉnh sửa Bài tập" : lesson?.title) || "Chỉnh sửa"
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
                        label: isEdit ? "Đang chỉnh sửa" : "Bản mới",
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
            ) : isEdit && quizId ? (
              undefined
            ) : isEdit && assignmentId ? (
              <HeroButton href={`${coursePath}/assignments/${assignmentId}`}>
                <Eye className="h-4 w-4" /> Xem bài tập
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
        ) : isEdit && !isAssignment && !isQuiz && !lesson ? (
          <div className="grid place-items-center rounded-2xl bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
          </div>
        ) : !type ? (
          <ActivityChooser
            onSelect={(t) =>
              router.replace(`/teacher/content/courses/${courseId}/lessons/new?section=${targetModuleId}&type=${t}`)
            }
            onSelectAssign={() =>
              router.replace(`/teacher/content/courses/${courseId}/lessons/new?section=${targetModuleId}&type=ASSIGNMENT`)
            }
            onSelectQuiz={() =>
              router.replace(`/teacher/content/courses/${courseId}/lessons/new?section=${targetModuleId}&type=QUIZ`)
            }
          />
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            {isAssignment ? (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSaveAssignment("course");
                }}
                className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                {assignmentStatus === "PUBLISHED" && (
                  <div className="flex items-start gap-3 border-b border-sky-200 bg-sky-50 px-6 py-3.5 text-[13.5px] text-sky-900">
                    <Eye className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sky-600" />
                    <span>
                      Bài tập <b>đã xuất bản</b> — thay đổi có hiệu lực ngay với sinh viên. Bài đã nộp được giữ nguyên; nếu tắt một
                      hình thức nộp, sinh viên sẽ không gửi thêm theo hình thức đó.
                    </span>
                  </div>
                )}
                {/* ============ CHUNG ============ */}
                <Fieldset title="Chung">
                  <Field label="Tên bài tập" required error={errors.title}>
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setErrors((er) => ({ ...er, title: "" }));
                        markDirty();
                      }}
                      maxLength={255}
                      placeholder="VD: Bài tập lớn — Thiết kế cơ sở dữ liệu"
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                    />
                  </Field>

                  {course && (
                    <Field label="Topic" required>
                      <select
                        value={targetModuleId}
                        onChange={(e) => {
                          setModuleId(e.target.value);
                          markDirty();
                        }}
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

                  <Field label="Mô tả & Hướng dẫn">
                    <RichTextEditor
                      value={description}
                      onChange={(html) => {
                        setDescription(html);
                        markDirty();
                      }}
                      onUploadImage={(file) => uploadContentImage(courseId, file)}
                      onUploadAttachment={(file) => uploadContentAttachment(courseId, file)}
                      placeholder="Nhập hướng dẫn làm bài tập, yêu cầu định dạng nộp bài, rubric chấm điểm..."
                      minHeight={180}
                    />
                  </Field>
                </Fieldset>

                {/* ============ THỜI GIAN & ĐIỂM SỐ ============ */}
                <Fieldset title="Thời gian & Điểm số">
                  <Field
                    label="Điểm tối đa"
                    required
                    error={errors.maxScore}
                    hint="Thang điểm đánh giá cho bài nộp (ví dụ: 10 hoặc 100)"
                  >
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={maxScore}
                      onChange={(e) => {
                        setMaxScore(e.target.value);
                        setErrors((er) => ({ ...er, maxScore: "" }));
                        markDirty();
                      }}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                    />
                  </Field>

                  {/* Hai mốc thời gian chung một nhãn để ô "Hạn nộp" không bị đẩy xa sang phải */}
                  <Field label="Thời gian nộp bài" required error={errors.openAt || errors.dueAt}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[13px] font-medium text-slate-600">Thời gian mở</span>
                        <input
                          type="datetime-local"
                          value={openAt}
                          onChange={(e) => {
                            setOpenAt(e.target.value);
                            setErrors((er) => ({ ...er, openAt: "" }));
                            markDirty();
                          }}
                          className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100 ${
                            errors.openAt ? "border-red-400" : "border-slate-300"
                          }`}
                        />
                        <span className="mt-1.5 block text-[12.5px] text-slate-500">Sinh viên bắt đầu nộp bài từ thời điểm này</span>
                      </label>
                      <label className="block">
                        <span className="text-[13px] font-medium text-slate-600">Hạn nộp</span>
                        <input
                          type="datetime-local"
                          value={dueAt}
                          onChange={(e) => {
                            setDueAt(e.target.value);
                            setErrors((er) => ({ ...er, dueAt: "" }));
                            markDirty();
                          }}
                          className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100 ${
                            errors.dueAt ? "border-red-400" : "border-slate-300"
                          }`}
                        />
                        <span className="mt-1.5 block text-[12.5px] text-slate-500">Hạn cuối cùng để sinh viên nộp bài</span>
                      </label>
                    </div>
                  </Field>
                </Fieldset>

                {/* ============ TÙY CHỌN NỘP BÀI ============ */}
                <Fieldset title="Tùy chọn nộp bài">
                  <Field
                    label="Hình thức nộp bài"
                    required
                    error={errors.submissionTypes}
                  >
                    {/* Câu dẫn đặt trước các lựa chọn, thẳng lề với ô tick */}
                    <p className="mb-2.5 text-[12.5px] text-slate-500">
                      Chọn ít nhất một hình thức. Hình thức không được chọn sẽ bị ẩn ở trang nộp bài và bị chặn ở máy chủ.
                    </p>
                    <div className="space-y-3">
                      <Checkbox
                        checked={allowTextSubmission}
                        onChange={(v) => {
                          setAllowTextSubmission(v);
                          setErrors((er) => ({ ...er, submissionTypes: "" }));
                          markDirty();
                        }}
                        label="Bài làm văn bản"
                        hint="Sinh viên soạn câu trả lời ngay trên trình soạn thảo (có đầy đủ công cụ định dạng)."
                      />
                      <Checkbox
                        checked={allowFileSubmission}
                        onChange={(v) => {
                          setAllowFileSubmission(v);
                          setErrors((er) => ({ ...er, submissionTypes: "" }));
                          markDirty();
                        }}
                        label="Tệp đính kèm"
                        hint="Sinh viên đính kèm 1 tệp bài làm (nhiều tệp thì nén thành .zip). Hệ thống chặn tệp thực thi và giới hạn dung lượng."
                      />
                    </div>
                  </Field>

                  <Field label="Nộp trễ">
                    <Checkbox
                      checked={allowLateSubmission}
                      onChange={(v) => {
                        setAllowLateSubmission(v);
                        markDirty();
                      }}
                      label="Cho phép nộp bài sau hạn"
                      hint="Không bật: sau hạn nộp sinh viên không thể nộp hay sửa bài. Bật: vẫn nhận bài nhưng đánh dấu rõ “Nộp trễ” ở cả hai phía."
                    />
                  </Field>
                </Fieldset>

                {/* ============ NÚT LƯU ============ */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
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
                    {isEdit ? "Lưu thay đổi" : "Lưu và xuất bản"}
                  </button>
                  {!isEdit && (
                    <button
                      type="button"
                      disabled={!!saving}
                      onClick={() => void handleSaveAssignment("draft")}
                      title="Lưu ở trạng thái bản nháp (DRAFT) rồi quay lại khóa học"
                      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePen className="h-4 w-4" />}
                      Lưu bản nháp
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
                </div>
              </form>
            ) : isQuiz ? (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSaveQuiz(quizEditDraft ? "draft" : "course");
                }}
                className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                {quizLocked && (
                  <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3.5 text-[13.5px] text-amber-900">
                    <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
                    <span>
                      Đề kiểm tra đã {quizStatus === "CLOSED" ? "đóng" : "xuất bản"} nên chỉ xem được. Chỉ đề ở trạng thái
                      nháp (DRAFT) mới có thể sửa câu hỏi, đổi topic hoặc xóa.
                    </span>
                  </div>
                )}

                {/* ============ TAB ============ */}
                <div className="flex gap-1 border-b border-slate-200 bg-slate-50/70 px-6 py-2.5">
                  {[
                    { key: "config" as const, label: "Cấu hình", icon: ClipboardList },
                    { key: "questions" as const, label: `Câu hỏi (${chosenQuestions.length})`, icon: ListChecks },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setQuizTab(tab.key);
                        setErrors((er) => ({ ...er, questions: "", scores: "" }));
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition ${
                        quizTab === tab.key
                          ? "bg-white text-[#0f6cbf] shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {quizTab === "config" ? (
                  <>
                    <Fieldset title="Chung">
                      <Field label="Tên đề kiểm tra" required error={errors.title}>
                        <input
                          value={title}
                          onChange={(e) => {
                            setTitle(e.target.value);
                            setErrors((er) => ({ ...er, title: "" }));
                            markDirty();
                          }}
                          maxLength={255}
                          disabled={quizLocked}
                          placeholder="VD: Kiểm tra giữa kỳ — Cơ sở dữ liệu"
                          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </Field>

                      {course && (
                        <Field label="Topic" required>
                          <select
                            value={targetModuleId}
                            onChange={(e) => {
                              setModuleId(e.target.value);
                              markDirty();
                            }}
                            disabled={quizLocked}
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

                      <Field label="Hướng dẫn làm bài">
                        <div className={quizLocked ? "pointer-events-none opacity-60" : ""}>
                          <RichTextEditor
                            value={quizInstructions}
                            onChange={(html) => {
                              setQuizInstructions(html);
                              markDirty();
                            }}
                            onUploadImage={(file) => uploadContentImage(courseId, file)}
                            onUploadAttachment={(file) => uploadContentAttachment(courseId, file)}
                            placeholder="Mô tả phạm vi kiến thức, quy định làm bài, cách tính điểm..."
                            minHeight={160}
                          />
                        </div>
                      </Field>
                    </Fieldset>

                    <Fieldset title="Thời gian & Làm bài">
                      <Field label="Thời gian mở / đóng đề" required error={errors.openAt || errors.dueAt}>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-[13px] font-medium text-slate-600">Thời gian mở</span>
                            <input
                              type="datetime-local"
                              value={openAt}
                              onChange={(e) => {
                                setOpenAt(e.target.value);
                                setErrors((er) => ({ ...er, openAt: "" }));
                                markDirty();
                              }}
                              disabled={quizLocked}
                              className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 ${
                                errors.openAt ? "border-red-400" : "border-slate-300"
                              }`}
                            />
                            <span className="mt-1.5 block text-[12.5px] text-slate-500">
                              Sinh viên bắt đầu làm bài từ thời điểm này
                            </span>
                          </label>
                          <label className="block">
                            <span className="text-[13px] font-medium text-slate-600">Hạn đóng đề</span>
                            <input
                              type="datetime-local"
                              value={dueAt}
                              onChange={(e) => {
                                setDueAt(e.target.value);
                                setErrors((er) => ({ ...er, dueAt: "" }));
                                markDirty();
                              }}
                              disabled={quizLocked}
                              className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 ${
                                errors.dueAt ? "border-red-400" : "border-slate-300"
                              }`}
                            />
                            <span className="mt-1.5 block text-[12.5px] text-slate-500">
                              Sau thời điểm này sinh viên không thể bắt đầu làm bài
                            </span>
                          </label>
                        </div>
                      </Field>

                      <Field
                        label="Thời lượng làm bài"
                        error={errors.duration}
                        hint="Tính bằng phút. Để trống nếu sinh viên làm bài không giới hạn thời gian."
                      >
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={quizDuration}
                          onChange={(e) => {
                            setQuizDuration(e.target.value);
                            setErrors((er) => ({ ...er, duration: "" }));
                            markDirty();
                          }}
                          disabled={quizLocked}
                          placeholder="VD: 45"
                          className="h-10 w-full max-w-sm rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </Field>

                      <Field
                        label="Số lần làm tối đa"
                        required
                        error={errors.maxAttempts}
                        hint="Mỗi lần làm bài được chấm điểm tự động theo đáp án đã chọn."
                      >
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={quizMaxAttempts}
                          onChange={(e) => {
                            setQuizMaxAttempts(e.target.value);
                            setErrors((er) => ({ ...er, maxAttempts: "" }));
                            markDirty();
                          }}
                          disabled={quizLocked}
                          className="h-10 w-full max-w-sm rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </Field>
                    </Fieldset>

                    <Fieldset title="Tùy chọn chấm điểm">
                      <Field label="Chấm điểm">
                        <div className="space-y-3">
                          <Checkbox
                            checked={quizScoring}
                            onChange={(v) => {
                              setQuizScoring(v);
                              markDirty();
                            }}
                            disabled={quizLocked}
                            label="Đưa điểm đề kiểm tra vào sổ điểm"
                            hint="Khi xuất bản, tổng điểm các câu hỏi được chốt thành một cột điểm trong Gradebook. Tắt với bài khảo sát hoặc luyện tập."
                          />
                          <Checkbox
                            checked={quizShowAnswers}
                            onChange={(v) => {
                              setQuizShowAnswers(v);
                              markDirty();
                            }}
                            disabled={quizLocked}
                            label="Cho sinh viên xem đáp án sau khi nộp"
                            hint="Hiển thị đáp án đúng và điểm từng câu sau khi sinh viên hoàn tất lượt làm bài."
                          />
                        </div>
                      </Field>
                    </Fieldset>
                  </>
                ) : (
                  <div className="space-y-5 px-6 py-5">
                    {(errors.questions || errors.scores) && (
                      <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {errors.questions || errors.scores}
                      </p>
                    )}

                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-bold text-slate-900">
                          Câu hỏi trong đề ({chosenQuestions.length})
                        </p>
                        <p className="mt-0.5 text-[13px] text-slate-500">
                          Tổng điểm:{" "}
                          <span className="font-semibold text-slate-700">
                            {Number.isInteger(quizScoreTotal) ? quizScoreTotal : quizScoreTotal.toFixed(2)}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={quizLocked}
                        onClick={() => {
                          setNewQuestionError("");
                          setNewQuestionSetId(
                            bankSetFilter !== "all" && bankSetFilter !== "unfiled"
                              ? bankSetFilter
                              : ""
                          );
                          setNewQuestionOpen(true);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-[#0f6cbf] bg-blue-50 px-3.5 py-2 text-[13.5px] font-semibold text-[#0f6cbf] hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" /> Tạo câu hỏi mới
                      </button>
                    </div>

                    {chosenQuestions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
                        <ListChecks className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-2 text-[14px] font-semibold text-slate-700">Đề chưa có câu hỏi nào</p>
                        <p className="mt-1 text-[13px] text-slate-500">
                          Chọn câu hỏi từ ngân hàng bên dưới hoặc tạo câu hỏi mới để bắt đầu.
                        </p>
                      </div>
                    ) : (
                      <ol className="space-y-3">
                        {chosenQuestions.map((question, index) => (
                          <li
                            key={question.questionId}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
                          >
                            <div className="flex items-start gap-3">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[12.5px] font-bold text-slate-600">
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-semibold text-slate-900">{question.content}</p>
                                <p className="mt-0.5 text-[12px] font-medium text-slate-400">
                                  {question.questionType === "MULTIPLE" ? "Nhiều đáp án đúng" : "Một đáp án đúng"}
                                </p>
                                <ul className="mt-2 space-y-1">
                                  {question.choices.map((choice, choiceIndex) => (
                                    <li
                                      key={`${question.questionId}-${choiceIndex}`}
                                      className="flex items-start gap-1.5 text-[13px] text-slate-600"
                                    >
                                      {choice.isCorrect ? (
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                      ) : (
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                      )}
                                      <span className={choice.isCorrect ? "font-medium text-slate-800" : ""}>
                                        {choice.content}
                                      </span>
                                      {choice.isCorrect && (
                                        <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700">
                                          Đáp án
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <label className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
                                  Điểm
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={question.maxScore}
                                    disabled={quizLocked}
                                    onChange={(e) => updateChosenScore(question.questionId, e.target.value)}
                                    className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-[13px] text-slate-800 outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                                  />
                                </label>
                                <button
                                  type="button"
                                  disabled={quizLocked}
                                  onClick={() => removeChosenQuestion(question)}
                                  title="Bỏ câu hỏi khỏi đề"
                                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}

                    {newQuestionOpen && (
                      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <p className="text-[15px] font-bold text-slate-900">Tạo câu hỏi mới</p>
                            <p className="mt-0.5 text-[12.5px] text-slate-500">
                              Câu hỏi được lưu vào ngân hàng của bạn và thêm ngay vào đề.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewQuestionOpen(false)}
                            aria-label="Đóng biểu mẫu"
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <label className="block">
                          <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                            Nội dung câu hỏi <span className="text-red-500">*</span>
                          </span>
                          <textarea
                            autoFocus
                            value={newQuestionContent}
                            onChange={(e) => {
                              setNewQuestionContent(e.target.value);
                              setNewQuestionError("");
                            }}
                            rows={3}
                            maxLength={5000}
                            placeholder="Nhập nội dung câu hỏi..."
                            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                          />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="block">
                            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                              Loại câu hỏi
                            </span>
                            <select
                              value={newQuestionType}
                              onChange={(e) =>
                                changeNewQuestionType(e.target.value as QuestionTypeKey)
                              }
                              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] outline-none focus:border-[#0f6cbf]"
                            >
                              <option value="SINGLE">Một đáp án</option>
                              <option value="MULTIPLE">Nhiều đáp án</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                              Điểm mặc định
                            </span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={newQuestionScore}
                              onChange={(e) => {
                                setNewQuestionScore(e.target.value);
                                setNewQuestionError("");
                              }}
                              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                              Bộ câu hỏi
                            </span>
                            <select
                              value={newQuestionSetId}
                              onChange={(e) => setNewQuestionSetId(e.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] outline-none focus:border-[#0f6cbf]"
                            >
                              <option value="">Chưa phân bộ</option>
                              {bankSets.map((set) => (
                                <option key={set.id} value={set.id}>
                                  {set.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-semibold text-slate-700">
                                Lựa chọn trả lời <span className="text-red-500">*</span>
                              </p>
                              <p className="mt-0.5 text-[12px] text-slate-500">
                                {newQuestionType === "SINGLE"
                                  ? "Chọn đúng một đáp án."
                                  : "Chọn ít nhất hai đáp án đúng."}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setNewQuestionChoices((prev) => [
                                  ...prev,
                                  { content: "", isCorrect: false },
                                ])
                              }
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <Plus className="h-3.5 w-3.5" /> Thêm lựa chọn
                            </button>
                          </div>

                          <div className="space-y-2">
                            {newQuestionChoices.map((choice, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2"
                              >
                                <input
                                  type={newQuestionType === "SINGLE" ? "radio" : "checkbox"}
                                  name="new-quiz-question-choice"
                                  checked={choice.isCorrect}
                                  onChange={() => toggleNewQuestionCorrect(index)}
                                  title="Đánh dấu đáp án đúng"
                                  className="h-4 w-4 shrink-0 accent-[#0f6cbf]"
                                />
                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11.5px] font-bold text-slate-500">
                                  {String.fromCharCode(65 + index)}
                                </span>
                                <input
                                  value={choice.content}
                                  onChange={(e) =>
                                    setNewQuestionChoices((prev) =>
                                      prev.map((item, choiceIndex) =>
                                        choiceIndex === index
                                          ? { ...item, content: e.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                  placeholder={`Nội dung lựa chọn ${String.fromCharCode(65 + index)}`}
                                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[13.5px] outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                                />
                                {choice.isCorrect && (
                                  <span className="hidden shrink-0 items-center gap-1 text-[11.5px] font-semibold text-green-700 sm:flex">
                                    <Check className="h-3.5 w-3.5" /> Đúng
                                  </span>
                                )}
                                <button
                                  type="button"
                                  disabled={newQuestionChoices.length <= 2}
                                  onClick={() =>
                                    setNewQuestionChoices((prev) =>
                                      prev.filter((_, choiceIndex) => choiceIndex !== index),
                                    )
                                  }
                                  title="Xóa lựa chọn"
                                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {newQuestionError && (
                          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
                            {newQuestionError}
                          </p>
                        )}

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            disabled={creatingQuestion}
                            onClick={() => setNewQuestionOpen(false)}
                            className="rounded-lg px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={creatingQuestion}
                            onClick={() => void createBankQuestion()}
                            className="flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
                          >
                            {creatingQuestion && <Loader2 className="h-4 w-4 animate-spin" />}
                            Lưu câu hỏi
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[14px] font-bold text-slate-900">Ngân hàng câu hỏi</p>
                        <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
                          <select
                            value={bankSetFilter}
                            onChange={(e) => setBankSetFilter(e.target.value)}
                            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#0f6cbf]"
                          >
                            <option value="all">Tất cả bộ câu hỏi</option>
                            <option value="unfiled">Chưa phân bộ</option>
                            {bankSets.map((set) => (
                              <option key={set.id} value={set.id}>
                                {set.name} ({set.questionCount})
                              </option>
                            ))}
                          </select>
                          <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              value={bankSearch}
                              onChange={(e) => setBankSearch(e.target.value)}
                              placeholder="Tìm theo nội dung câu hỏi..."
                              className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-[13.5px] outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        {bankLoading ? (
                          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-6 text-[13px] text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin text-[#0f6cbf]" /> Đang tải ngân hàng câu hỏi...
                          </div>
                        ) : filteredBankQuestions.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-[13px] text-slate-500">
                            {bankQuestions.length === 0
                              ? "Ngân hàng chưa có câu hỏi nào. Hãy tạo câu hỏi mới ở phía trên."
                              : "Không tìm thấy câu hỏi phù hợp với từ khóa."}
                          </p>
                        ) : (
                          <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                            {filteredBankQuestions.map((question) => {
                              const chosen = chosenQuestions.some((item) => item.questionId === question.id);
                              return (
                                <li
                                  key={question.id}
                                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13.5px] font-medium text-slate-800">{question.content}</p>
                                    <p className="mt-0.5 text-[12px] text-slate-500">
                                      {question.questionType === "MULTIPLE" ? "Nhiều đáp án" : "Một đáp án"} ·{" "}
                                      {question.choices.length} lựa chọn · mặc định {question.defaultScore} điểm
                                      {question.setName ? ` · ${question.setName}` : ""}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={quizLocked}
                                    onClick={() => toggleBankQuestion(question)}
                                    className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-40 ${
                                      chosen
                                        ? "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                        : "bg-[#0f6cbf] text-white hover:bg-[#0c599e]"
                                    }`}
                                  >
                                    {chosen ? "Bỏ chọn" : "Thêm vào đề"}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ============ NÚT LƯU ============ */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
                  {submitError && (
                    <p className="mb-1 flex w-full items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!!saving || quizLocked}
                    className="flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-5 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e] disabled:opacity-60"
                  >
                    {saving === (quizEditDraft ? "draft" : "course") && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {isEdit ? "Lưu thay đổi" : "Lưu và xuất bản"}
                  </button>
                  {(quizEditDraft || !isEdit) && (
                    <button
                      type="button"
                      disabled={!!saving || quizLocked}
                      onClick={() => void handleSaveQuiz(quizEditDraft ? "course" : "draft")}
                      title={
                        quizEditDraft
                          ? "Xuất bản đề để sinh viên có thể làm bài"
                          : "Lưu ở trạng thái bản nháp (DRAFT) rồi quay lại khóa học"
                      }
                      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {saving === (quizEditDraft ? "course" : "draft") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : quizEditDraft ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <FilePen className="h-4 w-4" />
                      )}
                      {quizEditDraft ? "Xuất bản đề" : "Lưu bản nháp"}
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
                </div>
              </form>
            ) : (
              <form
                noValidate
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
                          onUploadAttachment={(file) => uploadContentAttachment(courseId, file)}
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
                          onUploadAttachment={(file) => uploadContentAttachment(courseId, file)}
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
                <div className="flex flex-wrap items-center justify-center gap-2.5 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
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
                  <button
                    type="button"
                    disabled={!!saving}
                    onClick={() => handleSave("draft")}
                    title="Lưu ở trạng thái ẩn với sinh viên rồi quay lại khóa học"
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePen className="h-4 w-4" />}
                    Lưu bản nháp
                  </button>
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
            )}

            {/* Cột phải: loại, gợi ý, lưu nhanh */}
            <aside className="space-y-4 xl:sticky xl:top-20">
              {typeInfo && (
                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${typeInfo.iconClass}`}>
                      <typeInfo.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {typeInfo.category === "activity" ? "Hoạt động" : "Tài nguyên"}
                      </p>
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
                {isQuiz ? (
                  <>
                    <p className="text-[12.5px] text-slate-500">
                      {quizLocked
                        ? "Đề đã xuất bản hoặc đóng nên không thể chỉnh sửa."
                        : isEdit
                          ? "Cập nhật đề nháp. Xuất bản để sinh viên có thể làm bài và chốt điểm vào sổ điểm."
                          : "Lưu đề vào khóa học. Sinh viên có thể làm bài khi đến thời gian mở."}
                    </p>
                    <button
                      type="button"
                      disabled={!!saving || quizLocked}
                      onClick={() => void handleSaveQuiz(quizEditDraft ? "draft" : "course")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
                    >
                      {saving === (quizEditDraft ? "draft" : "course") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isEdit ? "Lưu thay đổi" : "Lưu và xuất bản"}
                    </button>
                    {(quizEditDraft || !isEdit) && (
                      <button
                        type="button"
                        disabled={!!saving || quizLocked}
                        onClick={() => void handleSaveQuiz(quizEditDraft ? "course" : "draft")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {saving === (quizEditDraft ? "course" : "draft") ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : quizEditDraft ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <FilePen className="h-4 w-4" />
                        )}
                        {quizEditDraft ? "Xuất bản đề" : "Lưu bản nháp"}
                      </button>
                    )}
                  </>
                ) : isAssignment ? (
                  <>
                    <p className="text-[12.5px] text-slate-500">
                      {isEdit
                        ? "Cập nhật bài tập trong topic đã chọn."
                        : "Lưu bài tập vào khóa học. Sinh viên có thể nộp bài khi đến thời gian mở."}
                    </p>
                    <button
                      type="button"
                      disabled={!!saving}
                      onClick={() => void handleSaveAssignment("course")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
                    >
                      {saving === "course" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isEdit ? "Lưu thay đổi" : "Lưu và xuất bản"}
                    </button>
                    {!isEdit && (
                      <button
                        type="button"
                        disabled={!!saving}
                        onClick={() => void handleSaveAssignment("draft")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePen className="h-4 w-4" />}
                        Lưu bản nháp
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[12.5px] text-slate-500">
                      {visible
                        ? "Lưu và quay lại: sinh viên thấy mục này ngay sau khi lưu."
                        : "Mục này đang ẩn với sinh viên."}
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
                    <button
                      type="button"
                      disabled={!!saving}
                      onClick={() => handleSave("draft")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePen className="h-4 w-4" />}
                      Lưu bản nháp
                    </button>
                    <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-slate-400">
                      <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Bản nháp được lưu ở trạng thái ẩn với sinh viên, có thể công bố sau.
                    </p>
                  </>
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
