-- Migration: Fix auth tables to match schema.prisma
-- Migration 20261008083000 tạo "otps" và "refresh_tokens" lệch với model OtpCode / RefreshToken
-- (otp_code thay vì otp_hash..., revoked_at thay vì revoked) khiến đăng nhập / OTP bị lỗi.
-- Viết idempotent để chạy an toàn trên cả DB đã đúng schema (vd. tạo bằng db push).

-- 1. refresh_tokens: revoked_at (timestamp) -> revoked (boolean)
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "revoked" BOOLEAN NOT NULL DEFAULT false;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'revoked_at') THEN
        UPDATE "refresh_tokens" SET "revoked" = true WHERE "revoked_at" IS NOT NULL;
        ALTER TABLE "refresh_tokens" DROP COLUMN "revoked_at";
    END IF;
END $$;

-- 2. otps: lưu hash OTP thay vì mã thô + các cột chống brute-force
-- OTP chỉ là dữ liệu tạm (hết hạn sau vài phút), mã thô cũ không thể chuyển sang hash nên xóa đi
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otps' AND column_name = 'otp_code') THEN
        DELETE FROM "otps";
        ALTER TABLE "otps" DROP COLUMN "otp_code";
    END IF;
END $$;
ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "otp_hash" VARCHAR(255) NOT NULL;
ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "payload" TEXT;
ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "blocked_until" TIMESTAMPTZ(6);
ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "consumed_at" TIMESTAMPTZ(6);
ALTER TABLE "otps" ALTER COLUMN "type" SET DEFAULT 'REGISTER_VERIFY';

-- 3. Đổi tên index theo schema.prisma (nếu index mới đã tồn tại thì xóa index cũ)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'otps_email_type_idx') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otps_email_type') THEN
            ALTER INDEX "otps_email_type_idx" RENAME TO "idx_otps_email_type";
        ELSE
            DROP INDEX "otps_email_type_idx";
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'otps_expires_at_idx') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otps_expires_at') THEN
            ALTER INDEX "otps_expires_at_idx" RENAME TO "idx_otps_expires_at";
        ELSE
            DROP INDEX "otps_expires_at_idx";
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'refresh_tokens_user_id_idx') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_refresh_tokens_user') THEN
            ALTER INDEX "refresh_tokens_user_id_idx" RENAME TO "idx_refresh_tokens_user";
        ELSE
            DROP INDEX "refresh_tokens_user_id_idx";
        END IF;
    END IF;
END $$;
