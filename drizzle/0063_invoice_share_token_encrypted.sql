ALTER TABLE "invoices"
ADD COLUMN IF NOT EXISTS "shared_token_enc" text;