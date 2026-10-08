/**
 * Hiển thị HTML do giáo viên soạn (Trang / Văn bản và phương tiện / mô tả).
 * HTML đã được backend làm sạch (sanitize-html) trước khi lưu.
 */
export default function RichContent({ html, className = "" }: { html?: string | null; className?: string }) {
  if (!html) return null;
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
