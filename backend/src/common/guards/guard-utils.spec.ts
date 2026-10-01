import { describe, it, expect } from 'vitest';
import { extractClassId } from './guard-utils.js';

describe('extractClassId', () => {
  it('should extract classId from req.params.classId', () => {
    const req = { params: { classId: '101' } };
    expect(extractClassId(req)).toBe(BigInt(101));
  });

  it('should extract classId from req.body.classId', () => {
    const req = { body: { classId: '303' } };
    expect(extractClassId(req)).toBe(BigInt(303));
  });

  it('should extract classId from req.query.classId', () => {
    const req = { query: { classId: '404' } };
    expect(extractClassId(req)).toBe(BigInt(404));
  });

  it('should return null when classId is missing', () => {
    const req = { params: {} };
    expect(extractClassId(req)).toBeNull();
  });

  it('should return null when classId is not a valid number string', () => {
    const req = { params: { classId: 'abc-invalid' } };
    expect(extractClassId(req)).toBeNull();
  });

  it('should extract classId when provided as number', () => {
    const req = { body: { classId: 202 } };
    expect(extractClassId(req)).toBe(BigInt(202));
  });

  it('should return null when classId is a boolean or whitespace', () => {
    expect(extractClassId({ body: { classId: true } })).toBeNull();
    expect(extractClassId({ body: { classId: false } })).toBeNull();
    expect(extractClassId({ params: { classId: '   ' } })).toBeNull();
  });

  it('should return null when req is null or undefined', () => {
    expect(extractClassId(null)).toBeNull();
    expect(extractClassId(undefined)).toBeNull();
  });

  it('should reject non-positive or decimal numbers', () => {
    expect(extractClassId({ params: { classId: '0' } })).toBeNull();
    expect(extractClassId({ params: { classId: '-1' } })).toBeNull();
    expect(extractClassId({ body: { classId: 0 } })).toBeNull();
    expect(extractClassId({ body: { classId: -10 } })).toBeNull();
    expect(extractClassId({ body: { classId: 10.5 } })).toBeNull();
    expect(extractClassId({ params: { classId: '10.5' } })).toBeNull();
    expect(extractClassId({ params: { classId: 0n } })).toBeNull();
    expect(extractClassId({ params: { classId: -5n } })).toBeNull();
    expect(extractClassId({ params: { classId: 5n } })).toBe(5n);
  });
});
