-- Migration 0074: proposal/contract authoring snapshots
-- Additive and idempotent. Existing Client links remain readable but drafts may be created manually.

ALTER TABLE "proposals" ALTER COLUMN "client_id" DROP NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "client_id" DROP NOT NULL;

ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "client_email" text;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "proposal_number" text;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "content_blocks" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "client_email" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contract_number" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contract_date" date;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "content_blocks" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE "proposals" p
SET "client_name" = c."name", "client_email" = c."email"
FROM "clients" c
WHERE p."client_id" = c."id" AND p."client_name" IS NULL;

UPDATE "contracts" x
SET "client_name" = c."name", "client_email" = c."email"
FROM "clients" c
WHERE x."client_id" = c."id" AND x."client_name" IS NULL;

ALTER TABLE "proposals" ALTER COLUMN "client_name" SET DEFAULT '';
ALTER TABLE "proposals" ALTER COLUMN "client_name" SET NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "client_name" SET DEFAULT '';
ALTER TABLE "contracts" ALTER COLUMN "client_name" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "proposals_workspace_proposal_number_unique"
  ON "proposals" ("workspace_id", "proposal_number") WHERE "proposal_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "contracts_workspace_contract_number_unique"
  ON "contracts" ("workspace_id", "contract_number") WHERE "contract_number" IS NOT NULL;
