ALTER TABLE "clients"
ADD COLUMN IF NOT EXISTS "portal_token_enc" text;
