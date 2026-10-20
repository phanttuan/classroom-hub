-- Bộ câu hỏi giúp giáo viên phân loại ngân hàng câu hỏi (CH-105).
-- Câu hỏi thuộc tối đa một bộ; khi xóa bộ, câu hỏi chuyển về "Chưa phân bộ".

CREATE TABLE "question_sets" (
    "id" BIGSERIAL NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "question_sets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uk_question_sets_owner_name" ON "question_sets"("owner_id", "name");

ALTER TABLE "question_bank" ADD COLUMN "set_id" BIGINT;

CREATE INDEX "idx_question_bank_set_id" ON "question_bank"("set_id");

ALTER TABLE "question_sets"
  ADD CONSTRAINT "question_sets_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_bank"
  ADD CONSTRAINT "question_bank_set_id_fkey"
  FOREIGN KEY ("set_id") REFERENCES "question_sets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
