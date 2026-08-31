ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enrollment_deadline" timestamptz;
UPDATE "users"
SET "mfa_enrollment_deadline" = COALESCE("mfa_enrollment_deadline", now() + interval '14 days')
WHERE "two_factor_enabled" = false;
CREATE INDEX IF NOT EXISTS "users_mfa_enrollment_deadline_idx" ON "users" ("mfa_enrollment_deadline");

INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
SELECT '0084_mfa_enrollment_deadline', extract(epoch from now()) * 1000
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle."__drizzle_migrations" WHERE hash = '0084_mfa_enrollment_deadline'
);
