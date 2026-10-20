-- Migration: Loại hoạt động / tài nguyên cho Lesson (theo Moodle)
-- PAGE (Trang), FILE (Tệp), FOLDER (Thư mục), URL (Liên kết), LABEL (Văn bản & phương tiện)

-- 1. Enum + cột mới
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LessonType') THEN
        CREATE TYPE "LessonType" AS ENUM ('PAGE', 'FILE', 'FOLDER', 'URL', 'LABEL');
    END IF;
END $$;

ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "type" "LessonType" NOT NULL DEFAULT 'PAGE';
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "external_url" VARCHAR(2048);
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "settings" JSONB;

-- 2. Phân loại dữ liệu cũ (trước đây loại bài được đoán từ tiêu đề / nội dung)
-- 2.1 Bài có tệp đính kèm → FILE (1 tệp) hoặc FOLDER (nhiều tệp); nội dung cũ chuyển thành mô tả
UPDATE "lessons" l
SET "type" = CASE WHEN r.cnt > 1 THEN 'FOLDER'::"LessonType" ELSE 'FILE'::"LessonType" END,
    "description" = NULLIF(l."content", ''),
    "content" = ''
FROM (
    SELECT "lesson_id", COUNT(*) AS cnt FROM "resources" WHERE "lesson_id" IS NOT NULL GROUP BY "lesson_id"
) r
WHERE r."lesson_id" = l."id";

-- 2.2 Nội dung chứa đường dẫn http(s) → URL
UPDATE "lessons"
SET "type" = 'URL',
    "external_url" = substring("content" from 'https?://[^\s<>"]+'),
    "description" = NULLIF(btrim(regexp_replace("content", 'https?://[^\s<>"]+', '', 'g')), ''),
    "content" = ''
WHERE "type" = 'PAGE' AND "content" ~ 'https?://';

-- 2.3 Nội dung văn bản thuần → HTML (escape ký tự đặc biệt, mỗi dòng một đoạn)
UPDATE "lessons"
SET "content" = '<p>' || replace(
        replace(replace(replace("content", '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
        E'\n', '</p><p>'
    ) || '</p>'
WHERE "type" = 'PAGE' AND "content" <> '' AND "content" !~ '^\s*<';

UPDATE "lessons"
SET "description" = '<p>' || replace(
        replace(replace(replace("description", '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
        E'\n', '</p><p>'
    ) || '</p>'
WHERE "description" IS NOT NULL AND "description" !~ '^\s*<';
