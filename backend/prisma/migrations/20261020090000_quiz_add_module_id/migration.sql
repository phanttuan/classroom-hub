-- Đề kiểm tra thuộc một topic cụ thể trong khóa học (giống Assignment.module_id)
-- Bảng quizzes hiện chưa có dữ liệu nên có thể thêm cột NOT NULL trực tiếp.
ALTER TABLE "quizzes" ADD COLUMN "module_id" BIGINT NOT NULL;

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
