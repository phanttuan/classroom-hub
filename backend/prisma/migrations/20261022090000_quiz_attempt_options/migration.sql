-- Cách tính điểm khi làm nhiều lượt + trộn câu hỏi / đáp án theo từng lượt
CREATE TYPE "AttemptGradingMethod" AS ENUM ('HIGHEST', 'LATEST', 'AVERAGE');

ALTER TABLE "quizzes"
  ADD COLUMN "attempt_grading" "AttemptGradingMethod" NOT NULL DEFAULT 'HIGHEST',
  ADD COLUMN "shuffle_questions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shuffle_choices" BOOLEAN NOT NULL DEFAULT false;
