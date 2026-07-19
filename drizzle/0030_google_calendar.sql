ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "google_event_id" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "google_calendar_id" text;

CREATE TABLE IF NOT EXISTS "google_calendar_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE cascade,
  "google_account_email" text,
  "access_token_enc" text NOT NULL,
  "refresh_token_enc" text NOT NULL,
  "scope" text,
  "token_type" text,
  "expiry_date" timestamp with time zone,
  "calendar_id" text DEFAULT 'primary' NOT NULL,
  "status" text DEFAULT 'connected' NOT NULL,
  "last_error" text,
  "connected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "google_calendar_connections_user_id_idx"
  ON "google_calendar_connections" ("user_id");
