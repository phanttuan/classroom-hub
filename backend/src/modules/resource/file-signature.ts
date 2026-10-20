import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import { fileTypeFromBuffer, fileTypeFromFile, type FileTypeResult } from 'file-type';

/**
 * Kiểm tra "magic bytes": nội dung thật của tệp phải khớp với đuôi tệp.
 * Chặn trường hợp đổi tên virus.exe → bai-lam.pdf để lách kiểm tra theo đuôi.
 */

/** Đuôi tệp mà file-type nhận diện chắc chắn → nội dung thật bắt buộc phải khớp */
const STRICT_SIGNATURES: Record<string, string[]> = {
  pdf: ['pdf'],
  png: ['png'],
  jpg: ['jpg'],
  jpeg: ['jpg'],
  gif: ['gif'],
  webp: ['webp'],
  zip: ['zip'],
  rar: ['rar'],
  '7z': ['7z'],
  mp4: ['mp4'],
  // Office mới là gói zip — file-type có thể chỉ nhận ra là zip khi cấu trúc không chuẩn
  docx: ['docx', 'zip'],
  xlsx: ['xlsx', 'zip'],
  pptx: ['pptx', 'zip'],
  // Office cũ dùng định dạng Compound File Binary
  doc: ['cfb'],
  xls: ['cfb'],
  ppt: ['cfb'],
};

/** Nội dung thật là chương trình / gói cài đặt — chặn bất kể tên tệp là gì */
const EXECUTABLE_SIGNATURES = new Set(['exe', 'elf', 'macho', 'dmg', 'deb', 'rpm', 'apk', 'class', 'cab', 'lnk', 'xpi', 'crx']);

export interface SignatureSource {
  /** Tệp tạm trên đĩa (multer diskStorage) */
  path?: string;
  /** Tệp trong RAM (multer memoryStorage) */
  buffer?: Buffer;
}

export async function detectFileSignature(source: SignatureSource): Promise<FileTypeResult | undefined> {
  try {
    if (source.buffer) return await fileTypeFromBuffer(source.buffer);
    if (source.path) return await fileTypeFromFile(source.path);
  } catch {
    // file-type ném lỗi khi gặp gói zip / container hỏng → coi như không nhận diện được
  }
  return undefined;
}

/** Ném BadRequest nếu nội dung thật không khớp đuôi tệp hoặc là tệp thực thi */
export function assertFileSignature(fileName: string, detected: FileTypeResult | undefined): void {
  if (detected && EXECUTABLE_SIGNATURES.has(detected.ext)) {
    throw new BadRequestException(
      `Tệp "${fileName}" thực chất là chương trình thực thi (${detected.ext}), không được phép tải lên`,
    );
  }
  const ext = extname(fileName).slice(1).toLowerCase();
  const expected = STRICT_SIGNATURES[ext];
  if (!expected) return;
  if (!detected || !expected.includes(detected.ext)) {
    throw new BadRequestException(
      `Nội dung tệp "${fileName}" không đúng định dạng .${ext}${detected ? ` (thực tế là ${detected.ext})` : ''}`,
    );
  }
}

export async function verifyFileSignature(source: SignatureSource, fileName: string): Promise<FileTypeResult | undefined> {
  const detected = await detectFileSignature(source);
  assertFileSignature(fileName, detected);
  return detected;
}
