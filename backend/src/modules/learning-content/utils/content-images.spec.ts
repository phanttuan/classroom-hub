import { describe, it, expect } from 'vitest';
import { difference, extractContentImageIds } from './content-images.js';

const url = (path: string) => `https://res.cloudinary.com/demo/image/upload/v1791472871/${path}`;

describe('extractContentImageIds', () => {
  it('lấy public_id ảnh nội dung của hệ thống, bỏ phiên bản và đuôi tệp', () => {
    const html = `<p><img src="${url('classroom-hub/content-images/5/1791-ab12-so-do.png')}" alt="x"></p>`;
    expect([...extractContentImageIds(html)]).toEqual(['classroom-hub/content-images/5/1791-ab12-so-do']);
  });

  it('bỏ qua ảnh ngoài hệ thống và tệp đính kèm riêng tư', () => {
    const html =
      '<img src="https://example.com/a.png">' +
      `<img src="${url('khac/anh.png')}">` +
      '<a href="https://res.cloudinary.com/demo/raw/authenticated/classroom-hub/lessons/1/2/a.pdf">x</a>';
    expect(extractContentImageIds(html).size).toBe(0);
  });

  it('gộp nhiều phần HTML, bỏ trùng và bỏ tham số truy vấn', () => {
    const a = `<img src="${url('classroom-hub/content-images/5/a.webp')}?w=200">`;
    const b = `<img src="${url('classroom-hub/content-images/5/a.webp')}"><img src="${url('classroom-hub/content-images/5/b.jpg')}">`;
    expect([...extractContentImageIds(a, null, b)].sort()).toEqual([
      'classroom-hub/content-images/5/a',
      'classroom-hub/content-images/5/b',
    ]);
  });
});

describe('difference', () => {
  it('trả về ảnh có trước nhưng đã bị gỡ', () => {
    expect(difference(new Set(['a', 'b', 'c']), new Set(['b']))).toEqual(['a', 'c']);
  });
});
