import { randomInt } from 'crypto';

/**
 * Bảng ký tự sinh mã lớp học: loại bỏ các ký tự dễ gây nhầm lẫn:
 * 0 (số không), O (chữ O), 1 (số một), I (chữ I viết hoa).
 */
export const CLASS_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Sinh mã lớp học ngẫu nhiên cryptographically secure.
 * @param length Độ dài mã (mặc định 8 ký tự)
 */
export function generateClassCode(length = 8): string {
  let result = '';
  const alphabetLength = CLASS_CODE_ALPHABET.length;
  for (let i = 0; i < length; i++) {
    const index = randomInt(0, alphabetLength);
    result += CLASS_CODE_ALPHABET[index];
  }
  return result;
}

/**
 * Kiểm tra xem chuỗi mã lớp có đúng định dạng chuẩn không (độ dài 6-12 ký tự, thuộc bảng ký tự).
 */
export function isValidClassCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length < 6 || trimmed.length > 12) return false;
  for (const char of trimmed) {
    if (!CLASS_CODE_ALPHABET.includes(char)) {
      return false;
    }
  }
  return true;
}
