import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { verifyFileSignature } from './file-signature.js';

/** Đệm thêm byte 0 để file-type có đủ dữ liệu nhận diện */
const bytes = (head: number[] | string, size = 64) => {
  const b = Buffer.alloc(size);
  Buffer.from(head as never).copy(b);
  return b;
};

const PDF = bytes('%PDF-1.7\n');
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const EXE = bytes('MZ\x90\x00');
const ELF = bytes([0x7f, 0x45, 0x4c, 0x46]);
/** Gói zip rỗng hợp lệ: chỉ có End-Of-Central-Directory */
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x05, 0x06]), Buffer.alloc(18)]);
/** Gói zip hỏng (header mục đầu nhưng không có nội dung) — file-type ném lỗi */
const BROKEN_ZIP = bytes([0x50, 0x4b, 0x03, 0x04, 0x14, 0]);
const TEXT = bytes('xin chao, day la van ban thuong');

describe('verifyFileSignature', () => {
  it('chấp nhận tệp có nội dung khớp đuôi', async () => {
    await expect(verifyFileSignature({ buffer: PDF }, 'bai-lam.pdf')).resolves.toMatchObject({ ext: 'pdf' });
    await expect(verifyFileSignature({ buffer: PNG }, 'anh.PNG')).resolves.toMatchObject({ ext: 'png' });
    await expect(verifyFileSignature({ buffer: ZIP }, 'ma-nguon.zip')).resolves.toMatchObject({ ext: 'zip' });
  });

  it('chặn tệp thực thi đổi tên thành .pdf / .zip', async () => {
    await expect(verifyFileSignature({ buffer: EXE }, 'bai-lam.pdf')).rejects.toThrow(BadRequestException);
    await expect(verifyFileSignature({ buffer: EXE }, 'bai-lam.pdf')).rejects.toThrow(/thực thi/);
    await expect(verifyFileSignature({ buffer: ELF }, 'ma-nguon.zip')).rejects.toThrow(/thực thi/);
    // Tệp thực thi với đuôi lạ (không nằm trong danh sách chặn theo đuôi) vẫn bị chặn theo nội dung
    await expect(verifyFileSignature({ buffer: EXE }, 'tai-lieu.bin')).rejects.toThrow(/thực thi/);
  });

  it('chặn nội dung không khớp đuôi (văn bản thường đặt tên .pdf, PNG đặt tên .jpg)', async () => {
    await expect(verifyFileSignature({ buffer: TEXT }, 'bai-lam.pdf')).rejects.toThrow(/không đúng định dạng \.pdf/);
    await expect(verifyFileSignature({ buffer: PNG }, 'anh.jpg')).rejects.toThrow(/thực tế là png/);
  });

  it('zip hỏng → không nhận diện được → bị từ chối thay vì lỗi 500', async () => {
    await expect(verifyFileSignature({ buffer: BROKEN_ZIP }, 'ma-nguon.zip')).rejects.toThrow(/không đúng định dạng \.zip/);
  });

  it('bỏ qua đuôi không nằm trong danh sách bắt buộc (txt, md, csv, mã nguồn)', async () => {
    await expect(verifyFileSignature({ buffer: TEXT }, 'ghi-chu.txt')).resolves.toBeUndefined();
    await expect(verifyFileSignature({ buffer: TEXT }, 'main.py')).resolves.toBeUndefined();
    await expect(verifyFileSignature({}, 'khong-co-noi-dung.txt')).resolves.toBeUndefined();
  });
});
