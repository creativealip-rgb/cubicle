-- Phase 3: additive Service catalog and Project Service contract snapshots.
-- No package backfill here. Package migration stays explicit/manual in later phase.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_id_workspace_unique'
      AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE "projects"
      ADD CONSTRAINT "projects_id_workspace_unique" UNIQUE ("id", "workspace_id");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "service_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#64748b',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "service_categories_workspace_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "service_categories_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "service_categories_workspace_normalized_name_unique" UNIQUE ("workspace_id", "normalized_name"),
  CONSTRAINT "service_categories_name_not_blank_check" CHECK (length(btrim("name")) > 0)
);

CREATE TABLE IF NOT EXISTS "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "description" text,
  "category_id" uuid,
  "default_pricing_model" text NOT NULL DEFAULT 'fixed',
  "default_unit" text NOT NULL DEFAULT 'service',
  "default_price" numeric(12,2),
  "currency" text NOT NULL DEFAULT 'IDR',
  "status" text NOT NULL DEFAULT 'active',
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "services_workspace_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "services_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "services_category_workspace_fk"
    FOREIGN KEY ("category_id", "workspace_id") REFERENCES "service_categories"("id", "workspace_id") ON DELETE SET NULL,
  CONSTRAINT "services_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "services_pricing_model_check" CHECK ("default_pricing_model" IN ('fixed', 'hourly', 'unit')),
  CONSTRAINT "services_status_check" CHECK ("status" IN ('active', 'archived')),
  CONSTRAINT "services_name_not_blank_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "services_default_price_check" CHECK ("default_price" IS NULL OR "default_price" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "services_workspace_active_normalized_name_uidx"
  ON "services" ("workspace_id", lower(btrim(name)))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS "services_workspace_status_name_idx"
  ON "services" ("workspace_id", "status", "name");

CREATE TABLE IF NOT EXISTS "project_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "service_id" uuid,
  "package_item_id" uuid,
  "source_package_assignment_id" uuid,
  "name_snapshot" text NOT NULL,
  "description_snapshot" text,
  "pricing_model_snapshot" text NOT NULL DEFAULT 'fixed',
  "quantity" numeric(12,2) NOT NULL DEFAULT 1,
  "unit" text NOT NULL DEFAULT 'service',
  "unit_price" numeric(12,2),
  "currency_snapshot" text NOT NULL DEFAULT 'IDR',
  "amount" numeric(12,2),
  "included_allowance" numeric(12,2),
  "sort_order" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "project_services_workspace_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "project_services_project_workspace_fk"
    FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE CASCADE,
  CONSTRAINT "project_services_service_workspace_fk"
    FOREIGN KEY ("service_id", "workspace_id") REFERENCES "services"("id", "workspace_id") ON DELETE RESTRICT,
  CONSTRAINT "project_services_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "project_services_project_service_unique" UNIQUE ("project_id", "service_id"),
  CONSTRAINT "project_services_pricing_model_check" CHECK ("pricing_model_snapshot" IN ('fixed', 'hourly', 'unit')),
  CONSTRAINT "project_services_status_check" CHECK ("status" IN ('active', 'archived')),
  CONSTRAINT "project_services_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "project_services_unit_price_check" CHECK ("unit_price" IS NULL OR "unit_price" >= 0),
  CONSTRAINT "project_services_amount_check" CHECK ("amount" IS NULL OR "amount" >= 0)
);

CREATE INDEX IF NOT EXISTS "project_services_workspace_project_status_idx"
  ON "project_services" ("workspace_id", "project_id", "status");

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "project_service_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_project_service_fk'
      AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE "tasks"
      ADD CONSTRAINT "tasks_project_service_fk"
      FOREIGN KEY ("project_service_id") REFERENCES "project_services"("id") ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE "time_entries"
  ADD COLUMN IF NOT EXISTS "project_service_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'time_entries_project_service_fk'
      AND conrelid = 'time_entries'::regclass
  ) THEN
    ALTER TABLE "time_entries"
      ADD CONSTRAINT "time_entries_project_service_fk"
      FOREIGN KEY ("project_service_id") REFERENCES "project_services"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "tasks_workspace_project_service_idx"
  ON "tasks" ("workspace_id", "project_service_id");

CREATE INDEX IF NOT EXISTS "time_entries_workspace_project_service_start_idx"
  ON "time_entries" ("workspace_id", "project_service_id", "start_time");
