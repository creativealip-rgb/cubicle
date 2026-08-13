-- Migration 0077: disable unfunded add-on auto-renewal (Phase 3 corrective)
-- 0070/0072 created the entitlement tables with auto_renew DEFAULT true, but
-- schema.ts expects DEFAULT false: QRIS has no payment mandate, so nothing may
-- renew without a fresh payment. Flip the column default for future rows and
-- backfill existing rows to false. Additive and idempotent (SET DEFAULT and an
-- unconditional UPDATE are safe to re-run).

ALTER TABLE "user_storage_addons"
  ALTER COLUMN "auto_renew" SET DEFAULT false;

UPDATE "user_storage_addons"
  SET "auto_renew" = false
  WHERE true;

ALTER TABLE "user_extra_workspace_entitlements"
  ALTER COLUMN "auto_renew" SET DEFAULT false;

UPDATE "user_extra_workspace_entitlements"
  SET "auto_renew" = false
  WHERE true;

-- Migration ledger runner tracks this file; no production application without approval.
