-- Bài tập có vị trí trong topic (cùng dãy số với lessons.order_index) để kéo thả xen kẽ với bài học
ALTER TABLE "assignments" ADD COLUMN "order_index" INTEGER NOT NULL DEFAULT 0;

-- Dữ liệu cũ: xếp bài tập sau toàn bộ bài học của topic, theo thứ tự tạo
UPDATE "assignments" a
SET "order_index" = sub.next_index
FROM (
  SELECT
    a2."id",
    COALESCE((SELECT MAX(l."order_index") FROM "lessons" l WHERE l."module_id" = a2."module_id"), 0)
      + ROW_NUMBER() OVER (PARTITION BY a2."module_id" ORDER BY a2."created_at", a2."id") AS next_index
  FROM "assignments" a2
) sub
WHERE a."id" = sub."id";
