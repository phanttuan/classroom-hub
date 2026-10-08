-- Migration: Module mặc định "Chung" cho mỗi môn học
-- Mỗi Course luôn có đúng 1 module is_default = true, đứng đầu (order_index = 1),
-- không xóa / đổi tên được (kiểm tra ở LearningContentService).

-- 1. Thêm cột
ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

-- 2. Môn đã có module tên "Chung" → đánh dấu module "Chung" có thứ tự nhỏ nhất làm mặc định
UPDATE "modules" SET "is_default" = true
WHERE "id" IN (
    SELECT DISTINCT ON ("course_id") "id"
    FROM "modules"
    WHERE "title" = 'Chung'
    ORDER BY "course_id", "order_index"
)
AND NOT EXISTS (
    SELECT 1 FROM "modules" d WHERE d."course_id" = "modules"."course_id" AND d."is_default"
);

-- 3. Môn chưa có module mặc định → tạo "Chung" (tạm đặt cuối, bước 4 sẽ đưa lên đầu)
INSERT INTO "modules" ("course_id", "title", "order_index", "is_default", "created_at", "updated_at")
SELECT c."id", 'Chung',
       COALESCE((SELECT MAX(m."order_index") FROM "modules" m WHERE m."course_id" = c."id"), 0) + 1,
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "courses" c
WHERE NOT EXISTS (
    SELECT 1 FROM "modules" m WHERE m."course_id" = c."id" AND m."is_default"
);

-- 4. Đánh số lại: module mặc định đứng đầu, các module khác giữ thứ tự cũ.
-- Đổi sang số âm trước để không vi phạm unique (course_id, order_index) khi đánh số lại.
UPDATE "modules" SET "order_index" = -"order_index";
UPDATE "modules" m SET "order_index" = r.rn
FROM (
    SELECT "id",
           ROW_NUMBER() OVER (PARTITION BY "course_id" ORDER BY "is_default" DESC, "order_index" DESC) AS rn
    FROM "modules"
) r
WHERE m."id" = r."id";
