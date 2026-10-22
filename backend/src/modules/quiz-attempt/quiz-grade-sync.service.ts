import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ActorType,
  AttemptStatus,
  GradingMethod,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { aggregateAttemptScores } from './quiz-grading.js';

type Tx = Prisma.TransactionClient;

/**
 * Đồng bộ điểm đề kiểm tra vào sổ điểm (Grade) theo chính sách nhiều lượt của đề.
 * Dùng chung cho: nộp bài (chấm xong) và khi giáo viên đổi cách tính điểm sau khi đã có lượt làm.
 * Idempotent: upsert Grade theo (gradeItem, sinh viên); chỉ ghi GradeHistory khi điểm đổi.
 */
@Injectable()
export class QuizGradeSyncService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tính lại và ghi điểm của một sinh viên cho một đề. Không làm gì nếu đề không chấm điểm (không có GradeItem). */
  async syncStudentGrade(quizId: bigint, studentId: bigint, tx: Tx | PrismaService = this.prisma) {
    const quiz = await tx.quiz.findUnique({
      where: { id: quizId },
      select: { attemptGrading: true, gradeItem: { select: { id: true, maxScore: true } } },
    });
    if (!quiz?.gradeItem) return null;

    const attempts = await tx.quizAttempt.findMany({
      where: { quizId, studentId, status: AttemptStatus.GRADED },
      select: { attemptNumber: true, totalScore: true },
    });
    const score = aggregateAttemptScores(quiz.attemptGrading, attempts);
    if (score === null) return null;
    // Không vượt thang điểm đã chốt của GradeItem
    const capped = score.greaterThan(quiz.gradeItem.maxScore) ? quiz.gradeItem.maxScore : score;

    const existing = await tx.grade.findUnique({
      where: { uk_grades_grade_item_student: { gradeItemId: quiz.gradeItem.id, studentId } },
      select: { id: true, score: true, feedback: true },
    });
    if (existing && existing.score.equals(capped)) return existing.id;

    const saved = await tx.grade.upsert({
      where: { uk_grades_grade_item_student: { gradeItemId: quiz.gradeItem.id, studentId } },
      create: {
        gradeItemId: quiz.gradeItem.id,
        studentId,
        score: capped,
        gradingMethod: GradingMethod.AUTO,
        gradedBy: null,
        gradedAt: new Date(),
      },
      update: { score: capped, gradingMethod: GradingMethod.AUTO, gradedAt: new Date() },
      select: { id: true },
    });
    await tx.gradeHistory.create({
      data: {
        gradeId: saved.id,
        oldScore: existing?.score ?? null,
        newScore: capped,
        oldFeedback: existing?.feedback ?? null,
        newFeedback: existing?.feedback ?? null,
        actorType: ActorType.SYSTEM,
        reason: existing ? 'Chấm tự động — cập nhật theo lượt làm bài' : 'Chấm tự động đề kiểm tra',
      },
    });
    return saved.id;
  }

  /** Tính lại điểm của mọi sinh viên đã có lượt làm (khi đổi cách tính điểm nhiều lượt) */
  async resyncQuizGrades(quizId: bigint) {
    const students = await this.prisma.quizAttempt.findMany({
      where: { quizId, status: AttemptStatus.GRADED },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    for (const { studentId } of students) {
      await this.prisma.$transaction((tx) => this.syncStudentGrade(quizId, studentId, tx));
    }
    return students.length;
  }
}
