import { describe, it, expect } from 'vitest';
import {
  generateClassCode,
  isValidClassCode,
  CLASS_CODE_ALPHABET,
} from './class-code.util.js';

describe('class-code.util', () => {
  describe('generateClassCode', () => {
    it('should generate a code with default length of 8', () => {
      const code = generateClassCode();
      expect(code).toHaveLength(8);
    });

    it('should only contain characters from CLASS_CODE_ALPHABET', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateClassCode();
        for (const char of code) {
          expect(CLASS_CODE_ALPHABET.includes(char)).toBe(true);
        }
      }
    });

    it('should not contain ambiguous characters 0, O, 1, I', () => {
      const ambiguousChars = ['0', 'O', '1', 'I'];
      for (let i = 0; i < 50; i++) {
        const code = generateClassCode();
        for (const badChar of ambiguousChars) {
          expect(code.includes(badChar)).toBe(false);
        }
      }
    });

    it('should generate unique codes across multiple invocations', () => {
      const set = new Set<string>();
      for (let i = 0; i < 100; i++) {
        set.add(generateClassCode());
      }
      expect(set.size).toBe(100);
    });

    it('should support custom length', () => {
      expect(generateClassCode(6)).toHaveLength(6);
      expect(generateClassCode(10)).toHaveLength(10);
    });
  });

  describe('isValidClassCode', () => {
    it('should return true for valid code', () => {
      const code = generateClassCode();
      expect(isValidClassCode(code)).toBe(true);
    });

    it('should return false for code with invalid characters or incorrect length', () => {
      expect(isValidClassCode('12345678')).toBe(false); // contains '1'
      expect(isValidClassCode('ABC0DEF2')).toBe(false); // contains '0'
      expect(isValidClassCode('SHORT')).toBe(false); // length 5
      expect(isValidClassCode('')).toBe(false);
    });
  });
});

