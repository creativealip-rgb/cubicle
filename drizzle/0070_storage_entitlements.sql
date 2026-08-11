-- Migration 0070: storage add-ons and atomic workspace upload reservations
CREATE TABLE IF NOT EXISTS "user_storage_addons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "storage_bytes" bigint NOT NULL CHECK ("storage_bytes" > 0),
  "amount" numeric(12,2) NOT NULL CHECK ("amount" >= 0),
  "billing_period" text NOT NULL CHECK ("billing_period" IN ('monthly', 'yearly')),
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'cancel_scheduled', 'cancelled', 'expired')),
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "auto_renew" boolean NOT NULL DEFAULT true,
  "provider_order_id" text UNIQUE,
  "provider_event_id" text UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CHECK ("ends_at" > "starts_at")
);
CREATE INDEX IF NOT EXISTS "user_storage_addons_active_idx"
  ON "user_storage_addons" ("user_id", "status", "ends_at");

CREATE TABLE IF NOT EXISTS "workspace_storage_usage" (
  "workspace_id" uuid PRIMARY KEY REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "reserved_bytes" bigint NOT NULL DEFAULT 0 CHECK ("reserved_bytes" >= 0),
  "reserved_files" integer NOT NULL DEFAULT 0 CHECK ("reserved_files" >= 0),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "workspace_storage_usage" ("workspace_id")
SELECT "id" FROM "workspaces"
ON CONFLICT ("workspace_id") DO NOTHING;

CREATE INDEX IF NOT EXISTS "files_workspace_created_idx"
  ON "files" ("workspace_id", "created_at");
CREATE INDEX IF NOT EXISTS "files_workspace_client_idx"
  ON "files" ("workspace_id", "client_id");

-- Upgrade path: add reservation token table if uploads need resumable/multi-part support.
