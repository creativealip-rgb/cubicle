-- Quick timer: allow empty start + pause/resume same entry
ALTER TABLE "time_entries" ALTER COLUMN "client_id" DROP NOT NULL;
ALTER TABLE "time_entries" ALTER COLUMN "project_id" DROP NOT NULL;
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "paused_at" timestamp with time zone;
