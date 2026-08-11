-- Migration 0071: monthly/yearly plan billing period
ALTER TABLE "pakasir_payments"
  ADD COLUMN IF NOT EXISTS "billing_period" text NOT NULL DEFAULT 'yearly';

ALTER TABLE "pakasir_payments"
  DROP CONSTRAINT IF EXISTS "pakasir_payments_billing_period_check";
ALTER TABLE "pakasir_payments"
  ADD CONSTRAINT "pakasir_payments_billing_period_check"
  CHECK ("billing_period" IN ('monthly', 'yearly'));

CREATE INDEX IF NOT EXISTS "pakasir_payments_period_status_idx"
  ON "pakasir_payments" ("billing_period", "status");
