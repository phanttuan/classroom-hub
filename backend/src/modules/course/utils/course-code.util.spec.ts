import { describe, it, expect } from 'vitest';
import {
  generateCourseCode,
  isValidCourseCode,
  COURSE_CODE_ALPHABET,
} from './course-code.util.js';

describe('course-code.util', () => {
  describe('generateCourseCode', () => {
    it('should generate a code with default length of 8', () => {
      const code = generateCourseCode();
      expect(code).toHaveLength(8);
    });

    it('should only contain characters from COURSE_CODE_ALPHABET', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateCourseCode();
        for (const char of code) {
          expect(COURSE_CODE_ALPHABET.includes(char)).toBe(true);
        }
      }
    });

    it('should not contain ambiguous characters 0, O, 1, I', () => {
      const ambiguousChars = ['0', 'O', '1', 'I'];
      for (let i = 0; i < 50; i++) {
        const code = generateCourseCode();
        for (const badChar of ambiguousChars) {
          expect(code.includes(badChar)).toBe(false);
        }
      }
    });

    it('should generate unique codes across multiple invocations', () => {
      const set = new Set<string>();
      for (let i = 0; i < 100; i++) {
        set.add(generateCourseCode());
      }
      expect(set.size).toBe(100);
    });

    it('should support custom length', () => {
      expect(generateCourseCode(6)).toHaveLength(6);
      expect(generateCourseCode(10)).toHaveLength(10);
    });
  });

  describe('isValidCourseCode', () => {
    it('should return true for valid code', () => {
      const code = generateCourseCode();
      expect(isValidCourseCode(code)).toBe(true);
    });

    it('should return false for code with invalid characters or incorrect length', () => {
      expect(isValidCourseCode('12345678')).toBe(false); // contains '1'
      expect(isValidCourseCode('ABC0DEF2')).toBe(false); // contains '0'
      expect(isValidCourseCode('SHORT')).toBe(false); // length 5
      expect(isValidCourseCode('')).toBe(false);
    });
  });
});

