CREATE TABLE IF NOT EXISTS "client_google_calendar_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL UNIQUE REFERENCES "clients"("id") ON DELETE cascade,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "connected_by_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "google_account_email" text,
  "access_token_enc" text,
  "refresh_token_enc" text,
  "scope" text,
  "token_type" text,
  "expiry_date" timestamp with time zone,
  "calendar_id" text DEFAULT 'primary' NOT NULL,
  "invite_token_hash" text UNIQUE,
  "invite_token_expires_at" timestamp with time zone,
  "status" text DEFAULT 'pending_invite' NOT NULL,
  "last_error" text,
  "connected_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "client_gcal_workspace_id_idx"
  ON "client_google_calendar_connections" ("workspace_id");

CREATE INDEX IF NOT EXISTS "client_gcal_status_idx"
  ON "client_google_calendar_connections" ("status");
