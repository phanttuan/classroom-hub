/** Thư mục Cloudinary chứa ảnh chèn trong nội dung (Trang / Văn bản và phương tiện / mô tả) */
export const CONTENT_IMAGE_PREFIX = 'classroom-hub/content-images/';

const CLOUDINARY_URL = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>)]+/gi;

/**
 * Lấy public_id các ảnh nội dung của hệ thống trong HTML.
 * Chỉ nhận URL Cloudinary nằm trong CONTENT_IMAGE_PREFIX — ảnh từ nguồn ngoài bị bỏ qua.
 * VD: https://res.cloudinary.com/demo/image/upload/v17/classroom-hub/content-images/5/123-ab-anh.png
 *     → "classroom-hub/content-images/5/123-ab-anh"
 */
export function extractContentImageIds(...htmlParts: (string | null | undefined)[]): Set<string> {
  const ids = new Set<string>();
  for (const html of htmlParts) {
    if (!html) continue;
    for (const url of html.match(CLOUDINARY_URL) ?? []) {
      const start = url.indexOf(CONTENT_IMAGE_PREFIX);
      if (start < 0) continue;
      const path = url
        .slice(start)
        .replace(/[?#].*$/, '')
        .replace(/&quot;.*$/, '');
      const publicId = path.replace(/\.[a-z0-9]+$/i, '');
      if (publicId.length > CONTENT_IMAGE_PREFIX.length) ids.add(publicId);
    }
  }
  return ids;
}

/** Phần tử có trong `before` nhưng không còn trong `after` */
export function difference(before: Set<string>, after: Set<string>): string[] {
  return [...before].filter((id) => !after.has(id));
}
