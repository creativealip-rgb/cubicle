ALTER TABLE "clients" ALTER COLUMN "portal_slug_enabled" SET DEFAULT false;
UPDATE "clients" SET "portal_slug_enabled" = false WHERE "portal_slug_enabled" = true;