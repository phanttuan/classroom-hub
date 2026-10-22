import { describe, it, expect } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import {
  aggregateAttemptScores,
  gradeQuestion,
  parseSnapshot,
  shuffle,
  toStudentSnapshot,
  type QuestionSnapshot,
} from './quiz-grading.js';

const single: QuestionSnapshot = {
  questionId: '1',
  content: 'Thủ đô của Việt Nam?',
  questionType: 'SINGLE',
  choices: [
    { id: '11', content: 'Hà Nội', isCorrect: true, orderIndex: 1 },
    { id: '12', content: 'Huế', isCorrect: false, orderIndex: 2 },
    { id: '13', content: 'Đà Nẵng', isCorrect: false, orderIndex: 3 },
  ],
};

const multiple: QuestionSnapshot = {
  ...single,
  questionId: '2',
  questionType: 'MULTIPLE',
  choices: [
    { id: '21', content: 'A', isCorrect: true, orderIndex: 1 },
    { id: '22', content: 'B', isCorrect: true, orderIndex: 2 },
    { id: '23', content: 'C', isCorrect: false, orderIndex: 3 },
  ],
};

const max = new Prisma.Decimal(2.5);

describe('gradeQuestion', () => {
  it('SINGLE: đúng khi chọn đúng một đáp án đúng', () => {
    expect(gradeQuestion(single, ['11'], max)).toEqual({ isCorrect: true, awardedScore: max });
    expect(gradeQuestion(single, ['12'], max).isCorrect).toBe(false);
    expect(gradeQuestion(single, [], max).isCorrect).toBe(false);
    expect(gradeQuestion(single, ['11', '12'], max).isCorrect).toBe(false);
  });

  it('MULTIPLE: all-or-nothing — phải chọn đúng toàn bộ và không thừa', () => {
    expect(gradeQuestion(multiple, ['21', '22'], max).isCorrect).toBe(true);
    expect(gradeQuestion(multiple, ['22', '21'], max).awardedScore.toFixed(2)).toBe('2.50');
    expect(gradeQuestion(multiple, ['21'], max).isCorrect).toBe(false);
    expect(gradeQuestion(multiple, ['21', '22', '23'], max).isCorrect).toBe(false);
    expect(gradeQuestion(multiple, ['21', '22', '23'], max).awardedScore.toFixed(2)).toBe('0.00');
  });
});

describe('aggregateAttemptScores', () => {
  const attempts = [
    { attemptNumber: 1, totalScore: new Prisma.Decimal(6) },
    { attemptNumber: 3, totalScore: new Prisma.Decimal(7) },
    { attemptNumber: 2, totalScore: new Prisma.Decimal(9) },
  ];
  it('HIGHEST / LATEST (theo attemptNumber) / AVERAGE (2 chữ số)', () => {
    expect(aggregateAttemptScores('HIGHEST', attempts)?.toFixed(2)).toBe('9.00');
    expect(aggregateAttemptScores('LATEST', attempts)?.toFixed(2)).toBe('7.00');
    expect(aggregateAttemptScores('AVERAGE', attempts)?.toFixed(2)).toBe('7.33');
  });
  it('bỏ qua lượt chưa chấm; không có lượt → null', () => {
    expect(aggregateAttemptScores('HIGHEST', [{ attemptNumber: 1, totalScore: null }])).toBeNull();
    expect(aggregateAttemptScores('LATEST', [])).toBeNull();
  });
});

describe('snapshot helpers', () => {
  it('toStudentSnapshot không bao giờ chứa isCorrect', () => {
    const out = toStudentSnapshot(single);
    expect(out.choices.every((c) => !('isCorrect' in c))).toBe(true);
    expect(JSON.stringify(out)).not.toContain('isCorrect');
  });
  it('parseSnapshot chịu được dữ liệu thiếu', () => {
    const out = parseSnapshot({ questionId: 5, choices: [{ id: 9, isCorrect: 1 }] });
    expect(out.questionType).toBe('SINGLE');
    expect(out.choices[0]).toEqual({ id: '9', content: '', isCorrect: true, orderIndex: 1 });
  });
  it('shuffle giữ nguyên phần tử, không đổi mảng gốc', () => {
    const src = [1, 2, 3, 4, 5, 6];
    const out = shuffle(src);
    expect(out.sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(src).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
