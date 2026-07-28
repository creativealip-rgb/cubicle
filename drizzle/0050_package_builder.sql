-- Phase 4: additive Package Builder schema.
-- Safe intent: no drops, no destructive rewrites. Legacy packages.hours/active/project_id stay readable.

ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "allowance_type" text NOT NULL DEFAULT 'hours';
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "allowance_value" numeric(12,2);
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "lifecycle_class" text NOT NULL DEFAULT 'one_off';
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();

UPDATE "packages"
SET
  "allowance_value" = COALESCE("allowance_value", "hours"::numeric),
  "status" = CASE WHEN "active" THEN 'active' ELSE 'archived' END
WHERE "allowance_value" IS NULL OR "status" IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_id_workspace_unique') THEN
    ALTER TABLE "packages" ADD CONSTRAINT "packages_id_workspace_unique" UNIQUE ("id", "workspace_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_allowance_type_check') THEN
    ALTER TABLE "packages" ADD CONSTRAINT "packages_allowance_type_check" CHECK ("allowance_type" IN ('hours'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_lifecycle_class_check') THEN
    ALTER TABLE "packages" ADD CONSTRAINT "packages_lifecycle_class_check" CHECK ("lifecycle_class" IN ('one_off', 'legacy_recurring_unmodeled'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_status_check') THEN
    ALTER TABLE "packages" ADD CONSTRAINT "packages_status_check" CHECK ("status" IN ('active', 'archived'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_allowance_value_check') THEN
    ALTER TABLE "packages" ADD CONSTRAINT "packages_allowance_value_check" CHECK ("allowance_value" IS NULL OR "allowance_value" >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "packages_workspace_status_sort_idx"
  ON "packages" ("workspace_id", "status", "sort_order");

CREATE TABLE IF NOT EXISTS "package_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  "quantity" numeric(12,2) NOT NULL DEFAULT '1',
  "unit" text NOT NULL DEFAULT 'service',
  "unit_price" numeric(12,2),
  "currency" text NOT NULL DEFAULT 'IDR',
  "included_allowance" numeric(12,2),
  "sort_order" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "package_items_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "package_items_package_service_unique" UNIQUE ("package_id", "service_id"),
  CONSTRAINT "package_items_package_workspace_fk" FOREIGN KEY ("package_id", "workspace_id") REFERENCES "packages" ("id", "workspace_id") ON DELETE cascade,
  CONSTRAINT "package_items_service_workspace_fk" FOREIGN KEY ("service_id", "workspace_id") REFERENCES "services" ("id", "workspace_id") ON DELETE restrict,
  CONSTRAINT "package_items_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "package_items_unit_price_check" CHECK ("unit_price" IS NULL OR "unit_price" >= 0),
  CONSTRAINT "package_items_included_allowance_check" CHECK ("included_allowance" IS NULL OR "included_allowance" >= 0),
  CONSTRAINT "package_items_status_check" CHECK ("status" IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS "package_items_workspace_package_status_idx"
  ON "package_items" ("workspace_id", "package_id", "status");

CREATE TABLE IF NOT EXISTS "project_package_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "source_package_id" uuid,
  "source_lifecycle_class" text NOT NULL DEFAULT 'one_off',
  "name_snapshot" text NOT NULL,
  "description_snapshot" text,
  "price_snapshot" numeric(12,2) NOT NULL,
  "currency_snapshot" text NOT NULL DEFAULT 'IDR',
  "allowance_type_snapshot" text NOT NULL DEFAULT 'hours',
  "allowance_value_snapshot" numeric(12,2),
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "project_package_assignments_id_workspace_unique" UNIQUE ("id", "workspace_id"),
  CONSTRAINT "project_package_assignments_project_workspace_fk" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects" ("id", "workspace_id") ON DELETE cascade,
  CONSTRAINT "project_package_assignments_source_package_workspace_fk" FOREIGN KEY ("source_package_id", "workspace_id") REFERENCES "packages" ("id", "workspace_id") ON DELETE set null,
  CONSTRAINT "project_package_assignments_price_snapshot_check" CHECK ("price_snapshot" >= 0),
  CONSTRAINT "project_package_assignments_allowance_type_check" CHECK ("allowance_type_snapshot" IN ('hours')),
  CONSTRAINT "project_package_assignments_lifecycle_class_check" CHECK ("source_lifecycle_class" IN ('one_off', 'legacy_recurring_unmodeled')),
  CONSTRAINT "project_package_assignments_status_check" CHECK ("status" IN ('active', 'archived')),
  CONSTRAINT "project_package_assignments_allowance_value_check" CHECK ("allowance_value_snapshot" IS NULL OR "allowance_value_snapshot" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_package_assignments_active_project_uidx"
  ON "project_package_assignments" ("project_id")
  WHERE "status" = 'active';

CREATE INDEX IF NOT EXISTS "project_package_assignments_workspace_project_status_idx"
  ON "project_package_assignments" ("workspace_id", "project_id", "status");

ALTER TABLE "project_services" ADD COLUMN IF NOT EXISTS "package_item_id" uuid;
ALTER TABLE "project_services" ADD COLUMN IF NOT EXISTS "project_package_assignment_id" uuid;
ALTER TABLE "project_services" ADD COLUMN IF NOT EXISTS "source_package_assignment_id" uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_services_package_item_workspace_fk') THEN
    ALTER TABLE "project_services" ADD CONSTRAINT "project_services_package_item_workspace_fk" FOREIGN KEY ("package_item_id", "workspace_id") REFERENCES "package_items" ("id", "workspace_id") ON DELETE set null;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_services_project_package_assignment_workspace_fk') THEN
    ALTER TABLE "project_services" ADD CONSTRAINT "project_services_project_package_assignment_workspace_fk" FOREIGN KEY ("project_package_assignment_id", "workspace_id") REFERENCES "project_package_assignments" ("id", "workspace_id") ON DELETE set null;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_services_source_package_assignment_workspace_fk') THEN
    ALTER TABLE "project_services" ADD CONSTRAINT "project_services_source_package_assignment_workspace_fk" FOREIGN KEY ("source_package_assignment_id", "workspace_id") REFERENCES "project_package_assignments" ("id", "workspace_id") ON DELETE set null;
  END IF;
END $$;

ALTER TABLE "package_orders" ADD COLUMN IF NOT EXISTS "project_package_assignment_id" uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_orders_project_package_assignment_workspace_fk') THEN
    ALTER TABLE "package_orders" ADD CONSTRAINT "package_orders_project_package_assignment_workspace_fk" FOREIGN KEY ("project_package_assignment_id", "workspace_id") REFERENCES "project_package_assignments" ("id", "workspace_id") ON DELETE set null;
  END IF;
END $$;
