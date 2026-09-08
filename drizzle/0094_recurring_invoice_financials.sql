ALTER TABLE recurring_invoice_rules ADD COLUMN IF NOT EXISTS discount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE recurring_invoice_rules ADD COLUMN IF NOT EXISTS charge_type text NOT NULL DEFAULT 'none';
ALTER TABLE recurring_invoice_rules ADD COLUMN IF NOT EXISTS charge_rate numeric(6,2) NOT NULL DEFAULT 0;
ALTER TABLE recurring_invoice_rules ADD COLUMN IF NOT EXISTS due_days integer NOT NULL DEFAULT 14;

DO $$ BEGIN
  ALTER TABLE recurring_invoice_rules ADD CONSTRAINT recurring_invoice_rules_discount_check CHECK (discount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE recurring_invoice_rules ADD CONSTRAINT recurring_invoice_rules_charge_type_check CHECK (charge_type IN ('none','tax','admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE recurring_invoice_rules ADD CONSTRAINT recurring_invoice_rules_charge_rate_check CHECK (charge_rate >= 0 AND charge_rate <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE recurring_invoice_rules ADD CONSTRAINT recurring_invoice_rules_due_days_check CHECK (due_days >= 0 AND due_days <= 365);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO cubiqlo_migrations (id, checksum, operator_name)
VALUES ('0094_recurring_invoice_financials.sql', 'recurring-invoice-financials-v1', current_user)
ON CONFLICT (id) DO NOTHING;
