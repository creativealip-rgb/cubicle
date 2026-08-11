-- Migration 0072: extra workspace add-on entitlements
-- Team-only add-on: +1 workspace Rp30.000/month (Rp360.000/year).
-- Follows plan billing period, auto-renews with plan, cancel takes effect at period end.

-- Discriminate payment rows: 'plan' (existing) vs 'extra_workspace' (add-on).
ALTER TABLE "pakasir_payments"
  ADD COLUMN IF NOT EXISTS "payment_type" text NOT NULL DEFAULT 'plan';

ALTER TABLE "pakasir_payments"
  DROP CONSTRAINT IF EXISTS "pakasir_payments_payment_type_check";
ALTER TABLE "pakasir_payments"
  ADD CONSTRAINT "pakasir_payments_payment_type_check"
  CHECK ("payment_type" IN ('plan', 'extra_workspace'));

CREATE TABLE IF NOT EXISTS "user_extra_workspace_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "quantity" integer NOT NULL DEFAULT 1 CHECK ("quantity" > 0),
  "amount" numeric(12,2) NOT NULL CHECK ("amount" >= 0),
  "billing_period" text NOT NULL CHECK ("billing_period" IN ('monthly', 'yearly')),
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'cancel_scheduled', 'cancelled', 'expired')),
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "auto_renew" boolean NOT NULL DEFAULT true,
  "provider_order_id" text UNIQUE,
  "provider_event_id" text UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CHECK ("ends_at" > "starts_at")
);
CREATE INDEX IF NOT EXISTS "user_extra_workspace_entitlements_active_idx"
  ON "user_extra_workspace_entitlements" ("user_id", "status", "ends_at");
