ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "original_currency" text;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "original_amount" numeric(12,2);
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "conversion_rate" numeric(18,8);
