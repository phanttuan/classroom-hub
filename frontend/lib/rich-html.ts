export interface HtmlHeading {
  id: string;
  level: number;
  text: string;
}

const stripTags = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Gắn id cho các tiêu đề H1–H3 để làm mục lục "Trong trang này".
 * HTML đã được backend làm sạch nên chỉ thêm thuộc tính id, không thay đổi nội dung.
 */
export function withHeadingAnchors(html: string): { html: string; headings: HtmlHeading[] } {
  const headings: HtmlHeading[] = [];
  const out = html.replace(/<h([1-3])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (_m, level: string, attrs = "", inner: string) => {
    const text = stripTags(inner);
    if (!text) return _m;
    const id = `muc-${headings.length + 1}`;
    headings.push({ id, level: Number(level), text });
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, headings };
}

/** Thời gian đọc ước tính (~200 từ / phút) */
export function readingMinutes(html: string): number {
  const words = stripTags(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
