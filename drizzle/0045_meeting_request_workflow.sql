ALTER TABLE "portal_requests" ADD COLUMN IF NOT EXISTS "meeting_start_time" timestamp with time zone;
ALTER TABLE "portal_requests" ADD COLUMN IF NOT EXISTS "meeting_duration_minutes" integer;
ALTER TABLE "portal_requests" ADD COLUMN IF NOT EXISTS "meeting_timezone" text;
ALTER TABLE "portal_requests" ADD COLUMN IF NOT EXISTS "meeting_status" text;
ALTER TABLE "portal_requests" ADD COLUMN IF NOT EXISTS "meeting_response_note" text;
ALTER TABLE "portal_requests" ADD COLUMN IF NOT EXISTS "meeting_proposed_by_user_id" text;
ALTER TABLE "portal_requests" ADD COLUMN IF NOT EXISTS "appointment_id" uuid;

DO $$ BEGIN
  ALTER TABLE "portal_requests"
    ADD CONSTRAINT "portal_requests_meeting_status_check"
    CHECK ("meeting_status" IS NULL OR "meeting_status" IN ('requested', 'counter_proposed', 'approved', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "portal_requests"
    ADD CONSTRAINT "portal_requests_meeting_duration_check"
    CHECK ("meeting_duration_minutes" IS NULL OR "meeting_duration_minutes" IN (30, 45, 60, 90, 120));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "portal_requests"
    ADD CONSTRAINT "portal_requests_meeting_proposed_by_user_id_users_id_fk"
    FOREIGN KEY ("meeting_proposed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "portal_requests"
    ADD CONSTRAINT "portal_requests_appointment_id_appointments_id_fk"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "portal_requests_appointment_id_unique"
  ON "portal_requests" ("appointment_id")
  WHERE "appointment_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "appointment_calendar_syncs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "provider" text DEFAULT 'google' NOT NULL,
  "external_event_id" text,
  "external_calendar_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "appointment_calendar_syncs_target_type_check" CHECK ("target_type" IN ('user', 'client')),
  CONSTRAINT "appointment_calendar_syncs_provider_check" CHECK ("provider" IN ('google')),
  CONSTRAINT "appointment_calendar_syncs_status_check" CHECK ("status" IN ('pending', 'synced', 'failed', 'skipped')),
  CONSTRAINT "appointment_calendar_syncs_appointment_id_appointments_id_fk"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "appointment_calendar_syncs_target_unique"
  ON "appointment_calendar_syncs" ("appointment_id", "target_type", "provider");
CREATE INDEX IF NOT EXISTS "appointment_calendar_syncs_appointment_id_idx"
  ON "appointment_calendar_syncs" ("appointment_id");
CREATE INDEX IF NOT EXISTS "portal_requests_meeting_status_idx"
  ON "portal_requests" ("workspace_id", "meeting_status");
