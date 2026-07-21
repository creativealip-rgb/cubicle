ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "client_first_viewed_at" timestamp with time zone;
