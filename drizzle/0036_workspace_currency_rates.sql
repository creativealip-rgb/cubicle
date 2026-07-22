CREATE TABLE IF NOT EXISTS "workspace_currency_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "from_currency" text NOT NULL,
  "rate" numeric(18, 8) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_currency_rates_workspace_id_from_currency_unique"
  ON "workspace_currency_rates" ("workspace_id", "from_currency");
