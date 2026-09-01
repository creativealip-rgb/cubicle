ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enrollment_deadline" timestamptz;
UPDATE "users"
SET "mfa_enrollment_deadline" = COALESCE("mfa_enrollment_deadline", now() + interval '14 days')
WHERE "two_factor_enabled" = false;
CREATE INDEX IF NOT EXISTS "users_mfa_enrollment_deadline_idx" ON "users" ("mfa_enrollment_deadline");

INSERT INTO public."cubiqlo_migrations" (id, checksum, applied_at, execution_ms)
SELECT '0084_mfa_enrollment_deadline.sql', 'manual-mfa-enrollment-deadline', now(), 0
WHERE NOT EXISTS (
  SELECT 1 FROM public."cubiqlo_migrations" WHERE id = '0084_mfa_enrollment_deadline.sql'
);
