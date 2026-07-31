ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "task_mode_policy" text NOT NULL DEFAULT 'billing_default';
ALTER TABLE "projects" ADD CONSTRAINT "projects_task_mode_policy_check" CHECK ("task_mode_policy" IN ('billing_default', 'workflow', 'reusable', 'mixed'));

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "mode" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "lifecycle" text NOT NULL DEFAULT 'active';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "template_item_source_id" uuid;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_mode_check" CHECK ("mode" IN ('workflow', 'reusable'));
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lifecycle_check" CHECK ("lifecycle" IN ('active', 'archived'));

CREATE TABLE IF NOT EXISTS "task_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "description" text,
  "target" text NOT NULL DEFAULT 'all',
  "status" text NOT NULL DEFAULT 'active',
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "task_templates_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "task_templates_target_check" CHECK ("target" IN ('fixed_price', 'hourly_retainer', 'all')),
  CONSTRAINT "task_templates_status_check" CHECK ("status" IN ('active', 'archived'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "task_templates_workspace_active_normalized_name_uidx" ON "task_templates" ("workspace_id", "normalized_name") WHERE "status" = 'active';

CREATE TABLE IF NOT EXISTS "task_template_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "template_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "default_assignee_id" text,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "task_template_items_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "task_template_items_template_position_unique" UNIQUE ("template_id", "position"),
  CONSTRAINT "task_template_items_position_check" CHECK ("position" >= 0),
  CONSTRAINT "task_template_items_template_workspace_fk" FOREIGN KEY ("template_id", "workspace_id") REFERENCES "task_templates"("id", "workspace_id") ON DELETE CASCADE,
  CONSTRAINT "task_template_items_assignee_workspace_fk" FOREIGN KEY ("workspace_id", "default_assignee_id") REFERENCES "workspace_members"("workspace_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "task_template_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "payload_fingerprint" text NOT NULL,
  "result" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz,
  CONSTRAINT "task_template_imports_idempotency_unique" UNIQUE ("workspace_id", "project_id", "idempotency_key"),
  CONSTRAINT "task_template_imports_project_workspace_fk" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE CASCADE
);

UPDATE "tasks" t
SET "mode" = CASE
  WHEN t."behavior" = 'one_time' THEN 'workflow'
  WHEN t."behavior" = 'recurring' THEN 'reusable'
  WHEN p."billing_model" = 'legacy_package' THEN 'workflow'
  WHEN COALESCE(p."billing_model", p."billing_type") IN ('hourly', 'retainer', 'hours') THEN 'reusable'
  ELSE 'workflow'
END
FROM "projects" p
WHERE p."id" = t."project_id" AND p."workspace_id" = t."workspace_id" AND t."mode" IS NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "tasks" WHERE "mode" IS NULL) THEN
    RAISE EXCEPTION 'tasks.mode backfill left null rows';
  END IF;
END $$;

ALTER TABLE "tasks" ALTER COLUMN "mode" SET DEFAULT 'workflow';
ALTER TABLE "tasks" ALTER COLUMN "mode" SET NOT NULL;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_item_source_fk" FOREIGN KEY ("template_item_source_id") REFERENCES "task_template_items"("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "tasks" VALIDATE CONSTRAINT "tasks_template_item_source_fk";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_workspace_fk" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "tasks" VALIDATE CONSTRAINT "tasks_project_workspace_fk";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_item_source_workspace_fk" FOREIGN KEY ("template_item_source_id", "workspace_id") REFERENCES "task_template_items"("id", "workspace_id") NOT VALID;
ALTER TABLE "tasks" VALIDATE CONSTRAINT "tasks_template_item_source_workspace_fk";
CREATE INDEX IF NOT EXISTS "tasks_workspace_mode_lifecycle_idx" ON "tasks" ("workspace_id", "mode", "lifecycle");
CREATE INDEX IF NOT EXISTS "tasks_project_mode_lifecycle_position_idx" ON "tasks" ("project_id", "mode", "lifecycle", "position");
CREATE INDEX IF NOT EXISTS "task_template_imports_workspace_project_created_idx" ON "task_template_imports" ("workspace_id", "project_id", "created_at");
