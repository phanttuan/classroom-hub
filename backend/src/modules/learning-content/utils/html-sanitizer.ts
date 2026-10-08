import sanitizeHtml from 'sanitize-html';

/**
 * Làm sạch HTML do giáo viên soạn (Page / Label / mô tả) trước khi lưu,
 * vì nội dung này được render trực tiếp cho sinh viên → chống XSS.
 * Chỉ giữ các thẻ / thuộc tính mà trình soạn thảo (Tiptap) sinh ra.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'div', 'span',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'sub', 'sup', 'mark', 'code', 'pre', 'kbd',
    'blockquote', 'ul', 'ol', 'li', 'label', 'input',
    'a', 'img', 'figure', 'figcaption', 'iframe',
    'table', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  ],
  allowedAttributes: {
    '*': ['style', 'data-type', 'data-checked'],
    div: ['data-youtube-video'],
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    iframe: ['src', 'width', 'height', 'allowfullscreen', 'frameborder', 'allow'],
    input: ['type', 'checked', 'disabled'],
    td: ['colspan', 'rowspan', 'colwidth'],
    th: ['colspan', 'rowspan', 'colwidth'],
    col: ['span', 'style'],
    ol: ['start', 'type'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // Chỉ cho nhúng video từ các nền tảng tin cậy
  allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
      'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
      'text-align': [/^(left|right|center|justify)$/],
      width: [/^\d+(\.\d+)?(px|%)$/],
      'min-width': [/^\d+(\.\d+)?(px|%)$/],
    },
  },
  transformTags: {
    // Link mở tab mới luôn kèm rel an toàn
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer nofollow' } : attribs,
    }),
  },
};

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS).trim();
}

/** Trích văn bản thuần (dùng làm tiêu đề tự động cho LABEL) */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}
