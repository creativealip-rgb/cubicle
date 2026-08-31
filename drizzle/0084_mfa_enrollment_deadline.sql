ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enrollment_deadline" timestamptz;
UPDATE "users"
SET "mfa_enrollment_deadline" = COALESCE("mfa_enrollment_deadline", now() + interval '14 days')
WHERE "two_factor_enabled" = false;
CREATE INDEX IF NOT EXISTS "users_mfa_enrollment_deadline_idx" ON "users" ("mfa_enrollment_deadline");

INSERT INTO public."cubiqlo_migrations" (name, applied_at)
SELECT '0084_mfa_enrollment_deadline', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public."cubiqlo_migrations" WHERE name = '0084_mfa_enrollment_deadline'
);
