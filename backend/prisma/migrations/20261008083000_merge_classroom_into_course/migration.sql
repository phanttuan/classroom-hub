-- Migration: Merge Classroom into Course (Moodle model)
-- Plan: .superpowers/2026-10-08-ke-hoach-bo-classroom-gop-vao-course.md

-- 1. Create new Enums if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseStatus') THEN
        CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnrollmentStatus') THEN
        CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'REMOVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OtpType') THEN
        CREATE TYPE "OtpType" AS ENUM ('REGISTER_VERIFY', 'PASSWORD_RESET', 'CHANGE_EMAIL', 'TWO_FACTOR_AUTH');
    END IF;
END $$;

-- 2. Alter users: add avatar_url
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(500);

-- 3. Create otps and refresh_tokens tables
CREATE TABLE IF NOT EXISTS "otps" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "otp_code" VARCHAR(10) NOT NULL,
    "type" "OtpType" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "otps_email_type_idx" ON "otps"("email", "type");
CREATE INDEX IF NOT EXISTS "otps_expires_at_idx" ON "otps"("expires_at");

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'refresh_tokens_user_id_fkey') THEN
        ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Create enrollments table
CREATE TABLE IF NOT EXISTS "enrollments" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(6),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- 5. Drop old FKs pointing to classes
ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "courses_class_id_fkey";
ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "assignments_class_id_fkey";
ALTER TABLE "grade_items" DROP CONSTRAINT IF EXISTS "grade_items_class_id_fkey";
ALTER TABLE "grade_configs" DROP CONSTRAINT IF EXISTS "grade_configs_class_id_fkey";
ALTER TABLE "quizzes" DROP CONSTRAINT IF EXISTS "quizzes_class_id_fkey";
ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "announcements_class_id_fkey";
ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "calendar_events_class_id_fkey";

-- Drop old unique indexes
DROP INDEX IF EXISTS "courses_class_id_order_index_key";
DROP INDEX IF EXISTS "grade_configs_class_id_key";
DROP INDEX IF EXISTS "class_memberships_class_id_student_id_key";
DROP INDEX IF EXISTS "classes_class_code_key";

-- 6. Add new columns to courses
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "owner_id" BIGINT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "course_code" VARCHAR(50);
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE';

-- 7. Data migration: Copy classes -> courses (if classes table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'classes') THEN
        INSERT INTO "courses" ("id", "owner_id", "course_code", "name", "description", "status", "created_at", "updated_at")
        SELECT 
            c."id", 
            c."owner_id", 
            c."class_code", 
            c."name", 
            c."description", 
            c."status"::text::"CourseStatus", 
            c."created_at", 
            c."updated_at"
        FROM "classes" c
        ON CONFLICT ("id") DO UPDATE SET
            "owner_id" = EXCLUDED."owner_id",
            "course_code" = EXCLUDED."course_code",
            "name" = EXCLUDED."name",
            "description" = EXCLUDED."description",
            "status" = EXCLUDED."status";
    END IF;
END $$;

-- 8. Data migration: Copy class_memberships -> enrollments (if class_memberships table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'class_memberships') THEN
        INSERT INTO "enrollments" ("id", "course_id", "student_id", "status", "joined_at", "removed_at")
        SELECT 
            cm."id", 
            cm."class_id", 
            cm."student_id", 
            cm."status"::text::"EnrollmentStatus", 
            cm."joined_at", 
            cm."removed_at"
        FROM "class_memberships" cm
        ON CONFLICT ("id") DO NOTHING;
    END IF;
END $$;

-- 9. Rename class_id -> course_id on 6 assessment & communication tables (if class_id exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'class_id') THEN
        ALTER TABLE "assignments" RENAME COLUMN "class_id" TO "course_id";
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'class_id') THEN
        ALTER TABLE "quizzes" RENAME COLUMN "class_id" TO "course_id";
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'class_id') THEN
        ALTER TABLE "announcements" RENAME COLUMN "class_id" TO "course_id";
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'class_id') THEN
        ALTER TABLE "calendar_events" RENAME COLUMN "class_id" TO "course_id";
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'grade_items' AND column_name = 'class_id') THEN
        ALTER TABLE "grade_items" RENAME COLUMN "class_id" TO "course_id";
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'grade_configs' AND column_name = 'class_id') THEN
        ALTER TABLE "grade_configs" RENAME COLUMN "class_id" TO "course_id";
    END IF;
END $$;

-- 10. Clean up old unused columns from courses
ALTER TABLE "courses" DROP COLUMN IF EXISTS "class_id";
ALTER TABLE "courses" DROP COLUMN IF EXISTS "title";
ALTER TABLE "courses" DROP COLUMN IF EXISTS "order_index";

-- Enforce NOT NULL on courses columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "courses" WHERE "owner_id" IS NULL) THEN
        UPDATE "courses" SET "owner_id" = 1 WHERE "owner_id" IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM "courses" WHERE "course_code" IS NULL) THEN
        UPDATE "courses" SET "course_code" = 'COURSE' || id::text WHERE "course_code" IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM "courses" WHERE "name" IS NULL) THEN
        UPDATE "courses" SET "name" = 'Môn học ' || id::text WHERE "name" IS NULL;
    END IF;
END $$;

ALTER TABLE "courses" ALTER COLUMN "owner_id" SET NOT NULL;
ALTER TABLE "courses" ALTER COLUMN "course_code" SET NOT NULL;
ALTER TABLE "courses" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "courses" ALTER COLUMN "status" SET NOT NULL;

-- 11. Drop legacy classes and class_memberships tables
DROP TABLE IF EXISTS "class_memberships";
DROP TABLE IF EXISTS "classes";

-- Drop legacy enums
DROP TYPE IF EXISTS "ClassStatus";
DROP TYPE IF EXISTS "MembershipStatus";

-- 12. Create unique indexes and foreign keys
CREATE UNIQUE INDEX IF NOT EXISTS "courses_course_code_key" ON "courses"("course_code");
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'courses_owner_id_fkey') THEN
        ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_course_id_student_id_key" ON "enrollments"("course_id", "student_id");
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'enrollments_course_id_fkey') THEN
        ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'enrollments_student_id_fkey') THEN
        ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'grade_configs_course_id_fkey') THEN
        ALTER TABLE "grade_configs" ADD CONSTRAINT "grade_configs_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'assignments_course_id_fkey') THEN
        ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'grade_items_course_id_fkey') THEN
        ALTER TABLE "grade_items" ADD CONSTRAINT "grade_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'quizzes_course_id_fkey') THEN
        ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'announcements_course_id_fkey') THEN
        ALTER TABLE "announcements" ADD CONSTRAINT "announcements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'calendar_events_course_id_fkey') THEN
        ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "grade_configs_course_id_key" ON "grade_configs"("course_id");

-- 13. Sync serial sequence counters
SELECT setval(pg_get_serial_sequence('courses', 'id'), COALESCE(max(id), 1)) FROM "courses";
SELECT setval(pg_get_serial_sequence('enrollments', 'id'), COALESCE(max(id), 1)) FROM "enrollments";

