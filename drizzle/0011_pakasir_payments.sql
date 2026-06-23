CREATE TABLE IF NOT EXISTS "pakasir_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "order_id" text NOT NULL UNIQUE,
  "plan" text NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "payment_method" text DEFAULT 'PAKASIR_QRIS' NOT NULL,
  "raw_payload" jsonb,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
