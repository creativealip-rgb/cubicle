ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "billing_type" text NOT NULL DEFAULT 'project';
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "start_date" date;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "finish_date" date;

UPDATE "projects" SET "billing_type" = 'project' WHERE "billing_type" IS NULL;
