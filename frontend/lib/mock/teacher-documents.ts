/** Mock cho trang Tài liệu (Image 4). */
import type { DocFolder, TeacherDocument } from "@/lib/types/teacher";

export const docFolders: DocFolder[] = [
  { id: "all", label: "Tất cả tài liệu", count: 24, tone: "blue" },
  { id: "intro", label: "Giới thiệu", count: 5, tone: "orange" },
  { id: "html-css", label: "HTML & CSS", count: 6, tone: "green" },
  { id: "js", label: "JavaScript", count: 4, tone: "purple" },
  { id: "react", label: "React & Next.js", count: 5, tone: "blue" },
  { id: "ref", label: "Tài liệu tham khảo", count: 4, tone: "orange" },
];

export const docList: TeacherDocument[] = [
  {
    id: "doc-1",
    name: "Slide giới thiệu khóa học.pdf",
    description: "Giới thiệu tổng quan về nội dung khóa học",
    moduleLabel: "Giới thiệu",
    format: "PDF",
    size: "2.4 MB",
    uploadedAt: "12/09/2026",
    folderId: "intro",
  },
  {
    id: "doc-2",
    name: "Bài 1 - Tổng quan khóa học.mp4",
    description: "Video bài giảng",
    moduleLabel: "Bài 1",
    format: "MP4",
    size: "128 MB",
    uploadedAt: "12/09/2026",
    folderId: "intro",
  },
  {
    id: "doc-3",
    name: "Tài liệu HTML cơ bản.docx",
    description: "Tài liệu lý thuyết",
    moduleLabel: "Bài 2",
    format: "DOCX",
    size: "1.1 MB",
    uploadedAt: "10/09/2026",
    folderId: "html-css",
  },
  {
    id: "doc-4",
    name: "Slide CSS nâng cao.pptx",
    description: "Slide bài giảng",
    moduleLabel: "Bài 3",
    format: "PPTX",
    size: "8.5 MB",
    uploadedAt: "08/09/2026",
    folderId: "html-css",
  },
  {
    id: "doc-5",
    name: "Hướng dẫn cài đặt môi trường.pdf",
    description: "Tài liệu hướng dẫn",
    moduleLabel: "Bài 2",
    format: "PDF",
    size: "3.2 MB",
    uploadedAt: "07/09/2026",
    folderId: "intro",
  },
  {
    id: "doc-6",
    name: "Source code mẫu.zip",
    description: "Mã nguồn ví dụ",
    moduleLabel: "Bài 4",
    format: "ZIP",
    size: "5.8 MB",
    uploadedAt: "05/09/2026",
    folderId: "js",
  },
  {
    id: "doc-7",
    name: "Sơ đồ kiến trúc.png",
    description: "Hình ảnh minh họa",
    moduleLabel: "Bài 4",
    format: "PNG",
    size: "1.4 MB",
    uploadedAt: "01/09/2026",
    folderId: "react",
  },
  {
    id: "doc-8",
    name: "Bài tập thực hành.docx",
    description: "Bài tập kèm hướng dẫn",
    moduleLabel: "Bài 5",
    format: "DOCX",
    size: "950 KB",
    uploadedAt: "28/08/2026",
    folderId: "js",
  },
];

export const docFormatOptions = ["Tất cả định dạng", "PDF", "MP4", "DOCX", "PPTX", "ZIP", "PNG"];
export const docSortOptions = ["Mới nhất", "Tên A-Z", "Kích thước lớn nhất"];
