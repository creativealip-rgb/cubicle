ALTER TABLE packages ADD COLUMN IF NOT EXISTS custom_price numeric(12, 2);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS min_hours integer;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_hours integer;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS allow_custom boolean NOT NULL DEFAULT false;
