ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS "two_factor" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "secret" text NOT NULL,
  "backup_codes" text NOT NULL,
  "verified" boolean NOT NULL DEFAULT true,
  "failed_verification_count" integer NOT NULL DEFAULT 0,
  "locked_until" timestamptz
);
CREATE INDEX IF NOT EXISTS "two_factor_user_id_idx" ON "two_factor" ("user_id");
CREATE TABLE IF NOT EXISTS "passkey" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "public_key" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "credential_id" text NOT NULL UNIQUE,
  "counter" integer NOT NULL,
  "device_type" text NOT NULL,
  "backed_up" boolean NOT NULL,
  "transports" text,
  "created_at" timestamptz,
  "aaguid" text
);
CREATE INDEX IF NOT EXISTS "passkey_user_id_idx" ON "passkey" ("user_id");
CREATE INDEX IF NOT EXISTS "passkey_credential_id_idx" ON "passkey" ("credential_id");