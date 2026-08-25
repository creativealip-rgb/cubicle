CREATE TABLE IF NOT EXISTS "recurring_invoice_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "project_id" uuid,
  "frequency" text DEFAULT 'monthly' NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "next_run_date" date NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "currency" text DEFAULT 'IDR' NOT NULL,
  "terms" text,
  "notes" text,
  "lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "number_pattern" text DEFAULT 'INV-{YYYY}-{SEQ}' NOT NULL,
  "last_sequence" integer DEFAULT 0 NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "recurring_invoice_rules_frequency_check" CHECK ("frequency" IN ('monthly','quarterly','yearly')),
  CONSTRAINT "recurring_invoice_rules_last_sequence_check" CHECK ("last_sequence" >= 0),
  CONSTRAINT "recurring_invoice_rules_id_workspace_unique" UNIQUE("id", "workspace_id")
);

CREATE TABLE IF NOT EXISTS "recurring_invoice_generations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "rule_id" uuid NOT NULL,
  "occurrence_date" date NOT NULL,
  "invoice_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "recurring_invoice_generations_rule_occurrence_unique" UNIQUE("rule_id", "occurrence_date")
);

DO $$ BEGIN
  ALTER TABLE "recurring_invoice_rules" ADD CONSTRAINT "recurring_invoice_rules_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "recurring_invoice_rules" ADD CONSTRAINT "recurring_invoice_rules_client_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "recurring_invoice_rules" ADD CONSTRAINT "recurring_invoice_rules_project_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "recurring_invoice_rules" ADD CONSTRAINT "recurring_invoice_rules_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "recurring_invoice_generations" ADD CONSTRAINT "recurring_invoice_generations_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "recurring_invoice_generations" ADD CONSTRAINT "recurring_invoice_generations_rule_workspace_fk" FOREIGN KEY ("rule_id", "workspace_id") REFERENCES "recurring_invoice_rules"("id", "workspace_id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "recurring_invoice_generations" ADD CONSTRAINT "recurring_invoice_generations_invoice_fk" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "recurring_invoice_rules_due_idx" ON "recurring_invoice_rules" ("workspace_id", "is_active", "next_run_date");
CREATE INDEX IF NOT EXISTS "recurring_invoice_generations_workspace_idx" ON "recurring_invoice_generations" ("workspace_id");
