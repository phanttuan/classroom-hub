import { describe, it, expect } from 'vitest';
import { extractCourseId } from './guard-utils.js';

describe('extractCourseId', () => {
  it('should extract courseId from req.params.courseId', () => {
    const req = { params: { courseId: '101' } };
    expect(extractCourseId(req)).toBe(BigInt(101));
  });

  it('should extract courseId from req.params.id', () => {
    const req = { params: { id: '101' } };
    expect(extractCourseId(req)).toBe(BigInt(101));
  });

  it('should extract courseId from req.body.courseId', () => {
    const req = { body: { courseId: '303' } };
    expect(extractCourseId(req)).toBe(BigInt(303));
  });

  it('should extract courseId from req.query.courseId', () => {
    const req = { query: { courseId: '404' } };
    expect(extractCourseId(req)).toBe(BigInt(404));
  });

  it('should return null when courseId is missing', () => {
    const req = { params: {} };
    expect(extractCourseId(req)).toBeNull();
  });

  it('should return null when courseId is not a valid number string', () => {
    const req = { params: { courseId: 'abc-invalid' } };
    expect(extractCourseId(req)).toBeNull();
  });

  it('should extract courseId when provided as number', () => {
    const req = { body: { courseId: 202 } };
    expect(extractCourseId(req)).toBe(BigInt(202));
  });

  it('should return null when courseId is a boolean or whitespace', () => {
    expect(extractCourseId({ body: { courseId: true } })).toBeNull();
    expect(extractCourseId({ body: { courseId: false } })).toBeNull();
    expect(extractCourseId({ params: { courseId: '   ' } })).toBeNull();
  });

  it('should return null when req is null or undefined', () => {
    expect(extractCourseId(null)).toBeNull();
    expect(extractCourseId(undefined)).toBeNull();
  });

  it('should reject non-positive or decimal numbers', () => {
    expect(extractCourseId({ params: { courseId: '0' } })).toBeNull();
    expect(extractCourseId({ params: { courseId: '-1' } })).toBeNull();
    expect(extractCourseId({ body: { courseId: 0 } })).toBeNull();
    expect(extractCourseId({ body: { courseId: -10 } })).toBeNull();
    expect(extractCourseId({ body: { courseId: 10.5 } })).toBeNull();
    expect(extractCourseId({ params: { courseId: '10.5' } })).toBeNull();
    expect(extractCourseId({ params: { courseId: 0n } })).toBeNull();
    expect(extractCourseId({ params: { courseId: -5n } })).toBeNull();
    expect(extractCourseId({ params: { courseId: 5n } })).toBe(5n);
  });
});
