ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'technical';
CREATE INDEX IF NOT EXISTS "support_tickets_category_idx" ON "support_tickets" ("category");
