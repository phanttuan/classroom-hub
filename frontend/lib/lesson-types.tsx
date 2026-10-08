import {
  CheckSquare,
  ClipboardList,
  File,
  FileText,
  Folder,
  Link as LinkIcon,
  MessagesSquare,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { LessonDisplayMode, LessonTypeKey } from "@/lib/types/learning-content";

export interface ChooserItem {
  key: string;
  /** Loại bài tương ứng — null nếu chưa hỗ trợ */
  type: LessonTypeKey | null;
  category: "activity" | "resource";
  label: string;
  /** Mô tả ngắn như thẻ thông tin trong bộ chọn của Moodle */
  summary: string;
  icon: LucideIcon;
  /** Màu theo nhóm: hoạt động (hồng / tím), tài nguyên (xanh) — giống Moodle 4 */
  iconClass: string;
}

/** Danh sách trong bộ chọn "Thêm hoạt động hoặc tài nguyên" */
export const CHOOSER_ITEMS: ChooserItem[] = [
  {
    key: "assign",
    type: null,
    category: "activity",
    label: "Bài tập",
    summary: "Giao bài, nhận bài nộp của sinh viên, chấm điểm và phản hồi.",
    icon: ClipboardList,
    iconClass: "bg-pink-50 text-pink-600",
  },
  {
    key: "quiz",
    type: null,
    category: "activity",
    label: "Đề kiểm tra",
    summary: "Bài kiểm tra trắc nghiệm có thời gian, chấm điểm tự động.",
    icon: CheckSquare,
    iconClass: "bg-pink-50 text-pink-600",
  },
  {
    key: "forum",
    type: null,
    category: "activity",
    label: "Diễn đàn",
    summary: "Trao đổi, thảo luận không đồng bộ giữa giảng viên và sinh viên.",
    icon: MessagesSquare,
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    key: "page",
    type: "PAGE",
    category: "resource",
    label: "Trang",
    summary:
      "Trang nội dung soạn bằng trình soạn thảo: văn bản, hình ảnh, bảng, video, liên kết… Phù hợp cho bài giảng lý thuyết.",
    icon: FileText,
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    key: "resource",
    type: "FILE",
    category: "resource",
    label: "Tệp",
    summary: "Cung cấp một tệp (PDF, Word, slide, video…) để sinh viên xem trực tiếp hoặc tải về.",
    icon: File,
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    key: "folder",
    type: "FOLDER",
    category: "resource",
    label: "Thư mục",
    summary: "Gom nhiều tệp liên quan vào một thư mục, giúp trang lớp học gọn gàng.",
    icon: Folder,
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    key: "url",
    type: "URL",
    category: "resource",
    label: "URL",
    summary: "Liên kết tới trang web bên ngoài: tài liệu online, nhóm Zalo, phòng họp Google Meet…",
    icon: LinkIcon,
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    key: "label",
    type: "LABEL",
    category: "resource",
    label: "Văn bản và phương tiện",
    summary: "Chèn văn bản, hình ảnh hoặc video hiển thị ngay trên trang lớp học, giữa các hoạt động.",
    icon: Type,
    iconClass: "bg-sky-50 text-sky-600",
  },
];

export const LESSON_TYPE_META: Record<LessonTypeKey, ChooserItem> = Object.fromEntries(
  CHOOSER_ITEMS.filter((i) => i.type).map((i) => [i.type, i])
) as Record<LessonTypeKey, ChooserItem>;

export const DISPLAY_OPTIONS: Record<"FILE" | "URL", { value: LessonDisplayMode; label: string }[]> = {
  FILE: [
    { value: "AUTO", label: "Tự động" },
    { value: "EMBED", label: "Nhúng vào trang" },
    { value: "DOWNLOAD", label: "Bắt buộc tải xuống" },
    { value: "OPEN", label: "Mở trực tiếp" },
    { value: "NEW_WINDOW", label: "Mở trong cửa sổ mới" },
  ],
  URL: [
    { value: "AUTO", label: "Tự động" },
    { value: "EMBED", label: "Nhúng vào trang" },
    { value: "OPEN", label: "Mở trực tiếp" },
    { value: "NEW_WINDOW", label: "Mở trong cửa sổ mới" },
  ],
};

export function formatFileSize(bytes: number | string | undefined): string {
  const n = Number(bytes);
  if (!n || Number.isNaN(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function fileTypeLabel(fileName: string, mimeType?: string): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toUpperCase() : "";
  if (ext) return ext;
  return mimeType?.split("/").pop()?.toUpperCase() ?? "";
}
