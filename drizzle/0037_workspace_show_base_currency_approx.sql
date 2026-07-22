ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "show_base_currency_approx" boolean NOT NULL DEFAULT true;
