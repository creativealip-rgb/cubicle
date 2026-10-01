ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "questionnaires" ADD COLUMN IF NOT EXISTS "slug" text;

CREATE UNIQUE INDEX IF NOT EXISTS "proposals_slug_uidx" ON "proposals" ("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "contracts_slug_uidx" ON "contracts" ("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "questionnaires_slug_uidx" ON "questionnaires" ("slug") WHERE "slug" IS NOT NULL;
