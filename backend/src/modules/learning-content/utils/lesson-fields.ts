import { BadRequestException } from '@nestjs/common';
import { LessonType } from '../../../generated/prisma/enums.js';
import type { LessonSettingsDto } from '../dto/lesson-settings.dto.js';
import { htmlToPlainText, sanitizeRichHtml } from './html-sanitizer.js';

export interface LessonFieldsInput {
  title?: string | null;
  description?: string | null;
  content?: string | null;
  externalUrl?: string | null;
  settings?: LessonSettingsDto | Record<string, unknown> | null;
}

export interface LessonFields {
  title: string;
  description: string | null;
  content: string;
  externalUrl: string | null;
  settings: Record<string, unknown>;
}

const LABEL_TITLE_MAX = 80;

/** Tùy chọn được phép theo từng loại — key khác bị bỏ qua */
const SETTINGS_KEYS: Record<LessonType, string[]> = {
  PAGE: ['showDescription'],
  FILE: ['showDescription', 'display', 'showSize', 'showType'],
  FOLDER: ['showDescription', 'folderDisplay'],
  URL: ['showDescription', 'display'],
  LABEL: [],
};

const DEFAULT_SETTINGS: Record<LessonType, Record<string, unknown>> = {
  PAGE: { showDescription: false },
  FILE: { showDescription: false, display: 'AUTO', showSize: true, showType: true },
  FOLDER: { showDescription: false, folderDisplay: 'PAGE' },
  URL: { showDescription: false, display: 'AUTO' },
  LABEL: {},
};

/** HTML có nội dung thật (chữ, ảnh, bảng, video) hay chỉ là thẻ rỗng */
function hasMeaningfulHtml(html: string): boolean {
  return htmlToPlainText(html).length > 0 || /<(img|iframe|table|hr)\b/i.test(html);
}

function normalizeUrl(raw: string): string {
  const value = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    throw new BadRequestException('URL không hợp lệ');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('URL phải bắt đầu bằng http:// hoặc https://');
  }
  return parsed.toString();
}

/**
 * Chuẩn hóa + kiểm tra dữ liệu bài học theo loại (giống form của từng loại trong Moodle).
 * `input` là dữ liệu sau khi gộp giá trị cũ với giá trị client gửi lên.
 */
export function buildLessonFields(type: LessonType, input: LessonFieldsInput): LessonFields {
  const description = sanitizeRichHtml(input.description);
  const usesContent = type === LessonType.PAGE || type === LessonType.LABEL;
  const content = usesContent ? sanitizeRichHtml(input.content) : '';

  if (usesContent && !hasMeaningfulHtml(content)) {
    throw new BadRequestException(
      type === LessonType.PAGE ? 'Nội dung trang không được để trống' : 'Nội dung không được để trống',
    );
  }

  let title = (input.title ?? '').trim();
  if (type === LessonType.LABEL && !title) {
    const text = htmlToPlainText(content);
    title = text.length > LABEL_TITLE_MAX ? `${text.slice(0, LABEL_TITLE_MAX - 1)}…` : text;
    if (!title) title = 'Văn bản và phương tiện';
  }
  if (!title) throw new BadRequestException('Tên không được để trống');

  let externalUrl: string | null = null;
  if (type === LessonType.URL) {
    if (!input.externalUrl?.trim()) throw new BadRequestException('URL ngoài không được để trống');
    externalUrl = normalizeUrl(input.externalUrl);
  }

  const rawSettings = (input.settings ?? {}) as Record<string, unknown>;
  const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS[type] };
  for (const key of SETTINGS_KEYS[type]) {
    if (rawSettings[key] !== undefined) settings[key] = rawSettings[key];
  }

  return {
    title,
    description: description || null,
    content,
    externalUrl,
    settings,
  };
}
