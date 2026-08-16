-- Migration 0079: superadmin control plane (admin dashboard)
-- Adds platform role + suspension columns to users and an admin audit trail.
--
-- 2026-08-17 plan: docs/plans/2026-08-17-admin-dashboard-plan.md
-- - users.role ('user' | 'admin', default 'user') — global superadmin flag
--   (separate from workspace_members.role: 'owner' | 'member' | 'viewer').
-- - users.banned / banned_at / banned_reason — suspension. Ban revokes all
--   active sessions and blocks new logins via the session-create hook.
-- - admin_audit_logs — immutable trail of every admin mutation. FK types
--   match the referenced PKs: users.id is text, workspaces.id is uuid.

-- 1. New users columns (idempotent, additive).
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS "banned" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "banned_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "banned_reason" text;

-- Constrain role values (mirrors the workspace_members.role CHECK style).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_role_check"
      CHECK ("role" IN ('user', 'admin'));
  END IF;
END $$;

-- 2. Admin audit trail.
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,  -- user.create | user.update | user.password_reset | user.ban | user.unban | user.plan_change
  "target_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "target_workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE SET NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ip_address" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_idx"
  ON "admin_audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_created_idx"
  ON "admin_audit_logs" ("admin_user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_user_idx"
  ON "admin_audit_logs" ("target_user_id");
