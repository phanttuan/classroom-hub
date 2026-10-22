import { randomInt } from 'node:crypto';
import { AttemptGradingMethod } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

/** Đáp án trong snapshot câu hỏi (QuizQuestion.questionSnapshot / AttemptQuestion.questionSnapshot) */
export interface SnapshotChoice {
  id: string;
  content: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface QuestionSnapshot {
  questionId: string;
  questionKey?: string;
  version?: number;
  content: string;
  questionType: 'SINGLE' | 'MULTIPLE';
  defaultScore?: string;
  choices: SnapshotChoice[];
}

/** Snapshot gửi cho sinh viên — không bao giờ chứa `isCorrect` */
export type StudentSnapshot = Omit<QuestionSnapshot, 'choices'> & {
  choices: Omit<SnapshotChoice, 'isCorrect'>[];
};

export function parseSnapshot(raw: unknown): QuestionSnapshot {
  const snap = (raw ?? {}) as Partial<QuestionSnapshot>;
  return {
    questionId: String(snap.questionId ?? ''),
    questionKey: snap.questionKey,
    version: snap.version,
    content: snap.content ?? '',
    questionType: snap.questionType === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE',
    defaultScore: snap.defaultScore,
    choices: Array.isArray(snap.choices)
      ? snap.choices.map((c, i) => ({
          id: String(c.id),
          content: c.content ?? '',
          isCorrect: Boolean(c.isCorrect),
          orderIndex: typeof c.orderIndex === 'number' ? c.orderIndex : i + 1,
        }))
      : [],
  };
}

/** Bỏ `isCorrect` khỏi snapshot trước khi trả cho sinh viên đang làm bài */
export function toStudentSnapshot(snapshot: QuestionSnapshot): StudentSnapshot {
  return {
    ...snapshot,
    choices: snapshot.choices.map(({ id, content, orderIndex }) => ({ id, content, orderIndex })),
  };
}

/** Fisher–Yates với số ngẫu nhiên an toàn */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface GradedAnswer {
  isCorrect: boolean;
  awardedScore: Prisma.Decimal;
}

/**
 * Chấm một câu từ snapshot đã đóng băng:
 *  - SINGLE: đúng khi chọn đúng một đáp án và đáp án đó đúng
 *  - MULTIPLE: all-or-nothing — tập đáp án chọn phải trùng khớp tập đáp án đúng
 */
export function gradeQuestion(
  snapshot: QuestionSnapshot,
  selectedChoiceIds: string[],
  maxScore: Prisma.Decimal,
): GradedAnswer {
  const correct = new Set(snapshot.choices.filter((c) => c.isCorrect).map((c) => c.id));
  const selected = new Set(selectedChoiceIds);
  let isCorrect: boolean;
  if (snapshot.questionType === 'SINGLE') {
    isCorrect = selected.size === 1 && correct.has([...selected][0]);
  } else {
    isCorrect =
      correct.size > 0 && selected.size === correct.size && [...selected].every((id) => correct.has(id));
  }
  return { isCorrect, awardedScore: isCorrect ? maxScore : new Prisma.Decimal(0) };
}

/** Điểm ghi sổ từ các lượt đã chấm theo chính sách của đề (lượt sắp theo attemptNumber tăng dần) */
export function aggregateAttemptScores(
  method: AttemptGradingMethod,
  attempts: { attemptNumber: number; totalScore: Prisma.Decimal | null }[],
): Prisma.Decimal | null {
  const graded = attempts
    .filter((a) => a.totalScore !== null)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
  if (!graded.length) return null;
  const scores = graded.map((a) => new Prisma.Decimal(a.totalScore!));
  switch (method) {
    case AttemptGradingMethod.LATEST:
      return scores[scores.length - 1];
    case AttemptGradingMethod.AVERAGE:
      return scores
        .reduce((sum, s) => sum.plus(s), new Prisma.Decimal(0))
        .div(scores.length)
        .toDecimalPlaces(2);
    case AttemptGradingMethod.HIGHEST:
    default:
      return scores.reduce((max, s) => (s.greaterThan(max) ? s : max), scores[0]);
  }
}

export const ATTEMPT_GRADING_LABEL: Record<AttemptGradingMethod, string> = {
  HIGHEST: 'Điểm cao nhất',
  LATEST: 'Lượt làm gần nhất',
  AVERAGE: 'Trung bình các lượt',
};
