-- Migration 0073: storage add-on payment metadata
-- Additive/idempotent. Extends shared Pakasir payment rows for storage entitlements.
ALTER TABLE "pakasir_payments"
  ADD COLUMN IF NOT EXISTS "entitlement_ref" text;

ALTER TABLE "pakasir_payments"
  DROP CONSTRAINT IF EXISTS "pakasir_payments_payment_type_check";
ALTER TABLE "pakasir_payments"
  ADD CONSTRAINT "pakasir_payments_payment_type_check"
  CHECK ("payment_type" IN ('plan', 'storage_addon', 'extra_workspace'));

CREATE INDEX IF NOT EXISTS "pakasir_payments_payment_type_status_idx"
  ON "pakasir_payments" ("payment_type", "status");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_storage_addons'
  ) THEN
    UPDATE "pakasir_payments"
    SET "entitlement_ref" = NULL
    WHERE "payment_type" <> 'storage_addon' AND "entitlement_ref" IS NOT NULL;
  END IF;
END $$;

-- Migration ledger runner tracks this file; no production application without approval.
-- ponytail: no backfill needed; existing plan/extra-workspace rows have no entitlement key.
