/**
 * Hiển thị HTML do giáo viên soạn (Trang / Văn bản và phương tiện / mô tả).
 * HTML đã được backend làm sạch (sanitize-html) trước khi lưu.
 */

/** Tham số gọn giao diện trình phát YouTube. */
const YT_UI_PARAMS: Record<string, string> = {
  rel: "0", // gợi ý cuối video chỉ hiện cùng kênh
  modestbranding: "1", // logo YouTube gọn lại
  iv_load_policy: "3", // tắt chú thích nổi trên video
  playsinline: "1", // phát trong trang trên iOS
};

/**
 * Chuẩn hóa iframe YouTube đã lưu trước đây: chuyển sang domain nocookie
 * và gắn tham số gọn UI. Chạy bằng regex chuỗi nên an toàn cả SSR.
 */
function normalizeYoutubeEmbeds(html: string): string {
  return html.replace(
    /https:\/\/(?:www\.youtube\.com|www\.youtube-nocookie\.com)\/embed\/([A-Za-z0-9_-]{6,})([^"'<>\s]*)/g,
    (src, id: string, query: string) => {
      void src;
      const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
      for (const [key, value] of Object.entries(YT_UI_PARAMS)) {
        if (!params.has(key)) params.set(key, value);
      }
      return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
    },
  );
}

export default function RichContent({ html, className = "" }: { html?: string | null; className?: string }) {
  if (!html) return null;
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: normalizeYoutubeEmbeds(html) }} />;
}
