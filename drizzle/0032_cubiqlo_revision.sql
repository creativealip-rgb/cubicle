-- Idempotent Cubiqlo revision fields.
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_email_body" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "client_number" text;

WITH numbered AS (
  SELECT id, workspace_id,
    row_number() OVER (PARTITION BY workspace_id ORDER BY created_at, id) AS sequence
  FROM clients WHERE client_number IS NULL
)
UPDATE clients c
SET client_number = 'CLI-' || lpad(numbered.sequence::text, 6, '0')
FROM numbered WHERE numbered.id = c.id AND c.client_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "clients_workspace_client_number_unique"
  ON "clients" ("workspace_id", "client_number") WHERE "client_number" IS NOT NULL;

CREATE OR REPLACE FUNCTION assign_client_number() RETURNS trigger AS $$
BEGIN
  IF NEW.client_number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.workspace_id::text));
    SELECT 'CLI-' || lpad((coalesce(max(substring(client_number from 5)::int), 0) + 1)::text, 6, '0')
      INTO NEW.client_number FROM clients WHERE workspace_id = NEW.workspace_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS clients_assign_number ON clients;
CREATE TRIGGER clients_assign_number BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION assign_client_number();
