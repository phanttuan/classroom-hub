-- 1. AlterEnum AttemptStatus (remove DRAFT safely)
CREATE TYPE "AttemptStatus_new" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');
ALTER TABLE "quiz_attempts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "quiz_attempts" ALTER COLUMN "status" TYPE "AttemptStatus_new"
  USING "status"::text::"AttemptStatus_new";
ALTER TYPE "AttemptStatus" RENAME TO "AttemptStatus_old";
ALTER TYPE "AttemptStatus_new" RENAME TO "AttemptStatus";
DROP TYPE "AttemptStatus_old";
ALTER TABLE "quiz_attempts" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- 2. AlterTable assignments (add required module_id)
ALTER TABLE "assignments" ADD COLUMN "module_id" BIGINT NOT NULL;

-- 3. AlterTable lessons (add created_by, optional content)
ALTER TABLE "lessons" ADD COLUMN "created_by" BIGINT,
ALTER COLUMN "content" DROP NOT NULL;

-- 4. AlterTable submissions (drop duplicate created_at)
ALTER TABLE "submissions" DROP COLUMN "created_at";

-- 5. AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assignments" ADD CONSTRAINT "assignments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Check XOR constraint for resources
ALTER TABLE "resources" ADD CONSTRAINT "chk_resources_parent_xor" CHECK (
  ("parent_type" = 'LESSON' AND "lesson_id" IS NOT NULL AND "submission_id" IS NULL)
  OR ("parent_type" = 'SUBMISSION' AND "submission_id" IS NOT NULL AND "lesson_id" IS NULL)
);

