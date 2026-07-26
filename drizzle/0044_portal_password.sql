ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "portal_password_hash" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "portal_session_version" text NOT NULL DEFAULT '1';