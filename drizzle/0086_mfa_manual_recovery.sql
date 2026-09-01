CREATE TABLE IF NOT EXISTS "mfa_recovery_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "reason" text NOT NULL,
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "cooling_until" timestamptz NOT NULL,
  "executed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "mfa_recovery_requests_status_check" CHECK ("status" IN ('pending','approved','rejected','executed','expired'))
);
CREATE INDEX IF NOT EXISTS "mfa_recovery_requests_user_idx" ON "mfa_recovery_requests" ("user_id");
CREATE INDEX IF NOT EXISTS "mfa_recovery_requests_queue_idx" ON "mfa_recovery_requests" ("status", "cooling_until");
CREATE TABLE IF NOT EXISTS "mfa_recovery_approvals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" uuid NOT NULL REFERENCES "mfa_recovery_requests"("id") ON DELETE CASCADE,
  "admin_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "decision" text NOT NULL,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "mfa_recovery_approvals_decision_check" CHECK ("decision" IN ('approved','rejected')),
  CONSTRAINT "mfa_recovery_approvals_unique_admin" UNIQUE ("request_id", "admin_user_id")
);
CREATE INDEX IF NOT EXISTS "mfa_recovery_approvals_request_idx" ON "mfa_recovery_approvals" ("request_id");
INSERT INTO cubiqlo_migrations (id, checksum, operator_name)
VALUES ('0086_mfa_manual_recovery.sql', 'manual-mfa-recovery', current_user)
ON CONFLICT (id) DO NOTHING;
