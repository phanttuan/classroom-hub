import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LessonType } from '../../../generated/prisma/enums.js';
import { buildLessonFields } from './lesson-fields.js';
import { sanitizeRichHtml } from './html-sanitizer.js';

describe('sanitizeRichHtml', () => {
  it('loại bỏ script, event handler và javascript: URL', () => {
    const html = sanitizeRichHtml(
      '<p onclick="alert(1)">Xin chào<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">',
    );
    expect(html).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(html).toContain('<p>Xin chào</p>');
  });

  it('giữ định dạng của trình soạn thảo: heading, bảng, trích dẫn, ảnh, căn lề, màu', () => {
    const input =
      '<h2 style="text-align: center">Tiêu đề</h2><blockquote><p>Trích dẫn</p></blockquote>' +
      '<table><tbody><tr><th colspan="2">A</th></tr></tbody></table>' +
      '<p><span style="color: #ff0000">đỏ</span><mark>vàng</mark></p><img src="https://res.cloudinary.com/x.png" alt="ảnh">';
    const html = sanitizeRichHtml(input);
    expect(html).toContain('<h2 style="text-align:center">');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<th colspan="2">');
    expect(html).toContain('color:#ff0000');
    expect(html).toContain('<img src="https://res.cloudinary.com/x.png"');
  });

  it('chỉ cho phép iframe YouTube / Vimeo', () => {
    expect(sanitizeRichHtml('<iframe src="https://evil.com/x"></iframe>')).not.toContain('evil.com');
    expect(sanitizeRichHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>')).toContain(
      'youtube.com/embed/abc',
    );
  });

  it('bỏ thuộc tính class để nội dung không mượn được CSS của giao diện', () => {
    expect(sanitizeRichHtml('<div class="fixed inset-0">x</div>')).toBe('<div>x</div>');
  });
});

describe('buildLessonFields', () => {
  it('PAGE bắt buộc tên và nội dung', () => {
    expect(() => buildLessonFields(LessonType.PAGE, { title: 'Bài 1', content: '<p></p>' })).toThrow(
      BadRequestException,
    );
    expect(() => buildLessonFields(LessonType.PAGE, { title: ' ', content: '<p>x</p>' })).toThrow(
      BadRequestException,
    );
    const fields = buildLessonFields(LessonType.PAGE, { title: ' Bài 1 ', content: '<p>Nội dung</p>' });
    expect(fields.title).toBe('Bài 1');
    expect(fields.externalUrl).toBeNull();
  });

  it('PAGE chỉ có ảnh vẫn hợp lệ', () => {
    expect(() =>
      buildLessonFields(LessonType.PAGE, { title: 'Ảnh', content: '<p><img src="https://a.com/x.png"></p>' }),
    ).not.toThrow();
  });

  it('LABEL tự sinh tên từ nội dung', () => {
    const fields = buildLessonFields(LessonType.LABEL, { content: '<p><strong>Lịch thi</strong> tuần 15</p>' });
    expect(fields.title).toBe('Lịch thi tuần 15');
  });

  it('URL bắt buộc http(s), tự thêm https:// khi thiếu', () => {
    expect(() => buildLessonFields(LessonType.URL, { title: 'Link', externalUrl: '' })).toThrow(BadRequestException);
    expect(() => buildLessonFields(LessonType.URL, { title: 'Link', externalUrl: 'javascript:alert(1)' })).toThrow(
      BadRequestException,
    );
    expect(buildLessonFields(LessonType.URL, { title: 'Link', externalUrl: 'zalo.me/g/abc' }).externalUrl).toBe(
      'https://zalo.me/g/abc',
    );
  });

  it('FILE / FOLDER không lưu nội dung HTML và chỉ giữ tùy chọn hợp lệ', () => {
    const fields = buildLessonFields(LessonType.FILE, {
      title: 'Slide',
      content: '<p>bỏ qua</p>',
      settings: { display: 'DOWNLOAD', folderDisplay: 'INLINE' },
    });
    expect(fields.content).toBe('');
    expect(fields.settings).toEqual({ showDescription: false, display: 'DOWNLOAD', showSize: true, showType: true });
  });
});
