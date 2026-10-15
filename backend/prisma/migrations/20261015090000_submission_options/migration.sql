-- Tùy chọn nộp bài do giáo viên thiết lập trên bài tập
ALTER TABLE "assignments"
  ADD COLUMN "allow_late_submission" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allow_text_submission" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allow_file_submission" BOOLEAN NOT NULL DEFAULT true;

-- Bài nộp: bài làm trực tuyến + đánh dấu nộp trễ
ALTER TABLE "submissions"
  ADD COLUMN "content" TEXT,
  ADD COLUMN "is_late" BOOLEAN NOT NULL DEFAULT false;
