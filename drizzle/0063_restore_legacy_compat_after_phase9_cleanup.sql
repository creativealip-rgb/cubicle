-- Restore legacy compatibility surfaces after Phase 9 cleanup while code cutover is completed.
-- Non-destructive: recreates empty legacy catalog/mapping tables and nullable FK columns
-- expected by current Drizzle schema/runtime routes.

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "selected_package_id" uuid;

CREATE TABLE IF NOT EXISTS "packages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "hours" integer,
  "price" numeric(12, 2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'IDR',
  "description" text,
  "features" text,
  "badge" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "custom_price" numeric(12, 2),
  "min_hours" integer,
  "max_hours" integer,
  "allow_custom" boolean NOT NULL DEFAULT false,
  "allowance_type" text NOT NULL DEFAULT 'hours',
  "allowance_value" numeric(12, 2),
  "lifecycle_class" text NOT NULL DEFAULT 'one_off',
  "status" text NOT NULL DEFAULT 'active',
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "packages_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "packages_price_check" CHECK ("price" >= 0),
  CONSTRAINT "packages_allowance_value_check" CHECK ("allowance_value" IS NULL OR "allowance_value" >= 0)
);

CREATE INDEX IF NOT EXISTS "packages_workspace_status_sort_idx"
  ON "packages" ("workspace_id", "status", "sort_order");

CREATE TABLE IF NOT EXISTS "activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "default_billable" boolean NOT NULL DEFAULT true,
  "default_hourly_rate" numeric(12, 2),
  "status" text NOT NULL DEFAULT 'active',
  "created_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "activities_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "activities_name_not_blank_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "activities_default_hourly_rate_check" CHECK ("default_hourly_rate" IS NULL OR "default_hourly_rate" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "activities_workspace_active_name_uidx"
  ON "activities" ("workspace_id", lower(btrim("name")))
  WHERE "status" = 'active';

CREATE INDEX IF NOT EXISTS "activities_workspace_status_name_idx"
  ON "activities" ("workspace_id", "status", "name");

CREATE TABLE IF NOT EXISTS "project_activities" (
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "project_id" uuid NOT NULL,
  "activity_id" uuid NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "rate_override" numeric(12, 2),
  "billable_override" boolean,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "project_activities_project_activity_unique" UNIQUE ("project_id", "activity_id"),
  CONSTRAINT "project_activities_project_workspace_fk" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE cascade,
  CONSTRAINT "project_activities_activity_workspace_fk" FOREIGN KEY ("activity_id", "workspace_id") REFERENCES "activities"("id", "workspace_id") ON DELETE cascade,
  CONSTRAINT "project_activities_rate_override_check" CHECK ("rate_override" IS NULL OR "rate_override" >= 0)
);

CREATE INDEX IF NOT EXISTS "project_activities_workspace_project_enabled_idx"
  ON "project_activities" ("workspace_id", "project_id", "enabled");

ALTER TABLE "time_entries"
  ADD COLUMN IF NOT EXISTS "activity_id" uuid;

ALTER TABLE "time_entries"
  ADD CONSTRAINT "time_entries_activity_workspace_fk"
  FOREIGN KEY ("activity_id", "workspace_id")
  REFERENCES "activities"("id", "workspace_id")
  ON DELETE restrict
  NOT VALID;

CREATE INDEX IF NOT EXISTS "time_entries_workspace_activity_start_idx"
  ON "time_entries" ("workspace_id", "activity_id", "start_time");
CREATE TABLE IF NOT EXISTS "package_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "package_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  "quantity" numeric(12, 2) NOT NULL DEFAULT 1,
  "unit" text NOT NULL DEFAULT 'service',
  "unit_price" numeric(12, 2),
  "currency" text NOT NULL DEFAULT 'IDR',
  "included_allowance" numeric(12, 2),
  "sort_order" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "package_items_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "package_items_package_service_unique" UNIQUE ("package_id", "service_id"),
  CONSTRAINT "package_items_package_workspace_fk" FOREIGN KEY ("package_id", "workspace_id") REFERENCES "packages"("id", "workspace_id") ON DELETE cascade,
  CONSTRAINT "package_items_service_workspace_fk" FOREIGN KEY ("service_id", "workspace_id") REFERENCES "services"("id", "workspace_id") ON DELETE restrict,
  CONSTRAINT "package_items_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "package_items_unit_price_check" CHECK ("unit_price" IS NULL OR "unit_price" >= 0),
  CONSTRAINT "package_items_included_allowance_check" CHECK ("included_allowance" IS NULL OR "included_allowance" >= 0)
);

CREATE INDEX IF NOT EXISTS "package_items_workspace_package_status_idx"
  ON "package_items" ("workspace_id", "package_id", "status");

CREATE TABLE IF NOT EXISTS "project_package_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "project_id" uuid NOT NULL,
  "source_package_id" uuid,
  "source_lifecycle_class" text NOT NULL DEFAULT 'one_off',
  "name_snapshot" text NOT NULL,
  "description_snapshot" text,
  "price_snapshot" numeric(12, 2) NOT NULL,
  "currency_snapshot" text NOT NULL DEFAULT 'IDR',
  "allowance_type_snapshot" text NOT NULL DEFAULT 'hours',
  "allowance_value_snapshot" numeric(12, 2),
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "project_package_assignments_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "project_package_assignments_project_workspace_fk" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE cascade,
  CONSTRAINT "project_package_assignments_source_package_workspace_fk" FOREIGN KEY ("source_package_id", "workspace_id") REFERENCES "packages"("id", "workspace_id") ON DELETE set null,
  CONSTRAINT "project_package_assignments_price_snapshot_check" CHECK ("price_snapshot" >= 0),
  CONSTRAINT "project_package_assignments_allowance_value_check" CHECK ("allowance_value_snapshot" IS NULL OR "allowance_value_snapshot" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_package_assignments_active_project_uidx"
  ON "project_package_assignments" ("project_id")
  WHERE "status" = 'active';

CREATE INDEX IF NOT EXISTS "project_package_assignments_workspace_project_status_idx"
  ON "project_package_assignments" ("workspace_id", "project_id", "status");

ALTER TABLE "package_orders"
  ADD COLUMN IF NOT EXISTS "package_id" uuid,
  ADD COLUMN IF NOT EXISTS "project_package_assignment_id" uuid;

-- Dev runtime still reads these nullable legacy snapshot columns on project detail
-- while Phase 9 code cleanup is incomplete. Keep them nullable so project pages render.
ALTER TABLE "project_services"
  ADD COLUMN IF NOT EXISTS "package_item_id" uuid,
  ADD COLUMN IF NOT EXISTS "project_package_assignment_id" uuid,
  ADD COLUMN IF NOT EXISTS "source_package_assignment_id" uuid;

ALTER TABLE "package_orders"
  ADD CONSTRAINT "package_orders_project_package_assignment_workspace_fk"
  FOREIGN KEY ("project_package_assignment_id", "workspace_id")
  REFERENCES "project_package_assignments"("id", "workspace_id")
  ON DELETE set null
  NOT VALID;
