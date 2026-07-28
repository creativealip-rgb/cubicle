-- Phase 2: additive workspace Activity catalog and Project enablement.
-- Existing time entries remain uncategorized (activity_id IS NULL).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_id_workspace_unique'
      AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "default_billable" boolean NOT NULL DEFAULT true,
  "default_hourly_rate" numeric(12,2),
  "status" text NOT NULL DEFAULT 'active',
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "activities_workspace_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "activities_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "activities_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "activities_status_check" CHECK ("status" IN ('active', 'archived')),
  CONSTRAINT "activities_name_not_blank_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "activities_default_hourly_rate_check"
    CHECK ("default_hourly_rate" IS NULL OR "default_hourly_rate" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "activities_workspace_active_name_uidx"
  ON "activities" ("workspace_id", lower(btrim(name)))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS "activities_workspace_status_name_idx"
  ON "activities" ("workspace_id", "status", "name");

CREATE TABLE IF NOT EXISTS "project_activities" (
  "workspace_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "activity_id" uuid NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "rate_override" numeric(12,2),
  "billable_override" boolean,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "project_activities_workspace_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "project_activities_project_activity_unique"
    UNIQUE ("project_id", "activity_id"),
  CONSTRAINT "project_activities_project_workspace_fk"
    FOREIGN KEY ("project_id", "workspace_id")
    REFERENCES "projects"("id", "workspace_id") ON DELETE CASCADE,
  CONSTRAINT "project_activities_activity_workspace_fk"
    FOREIGN KEY ("activity_id", "workspace_id")
    REFERENCES "activities"("id", "workspace_id") ON DELETE CASCADE,
  CONSTRAINT "project_activities_rate_override_check"
    CHECK ("rate_override" IS NULL OR "rate_override" >= 0)
);

CREATE INDEX IF NOT EXISTS "project_activities_workspace_project_enabled_idx"
  ON "project_activities" ("workspace_id", "project_id", "enabled");

ALTER TABLE "time_entries"
  ADD COLUMN IF NOT EXISTS "activity_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'time_entries_activity_workspace_fk'
      AND conrelid = 'time_entries'::regclass
  ) THEN
    ALTER TABLE "time_entries"
      ADD CONSTRAINT "time_entries_activity_workspace_fk"
      FOREIGN KEY ("activity_id", "workspace_id")
      REFERENCES "activities"("id", "workspace_id")
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "time_entries_workspace_activity_start_idx"
  ON "time_entries" ("workspace_id", "activity_id", "start_time");
