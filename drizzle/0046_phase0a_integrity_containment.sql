-- Portal commercial writes: resolve identity server-side and keep bearer tokens out of new history.
ALTER TABLE custom_package_requests
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE custom_package_requests
  ALTER COLUMN client_portal_token DROP NOT NULL;

ALTER TABLE package_orders
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE package_orders
  ALTER COLUMN client_portal_token DROP NOT NULL,
  ALTER COLUMN package_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_package_requests_client_id_clients_id_fk') THEN
    ALTER TABLE custom_package_requests
      ADD CONSTRAINT custom_package_requests_client_id_clients_id_fk
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_orders_client_id_clients_id_fk') THEN
    ALTER TABLE package_orders
      ADD CONSTRAINT package_orders_client_id_clients_id_fk
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS custom_package_requests_client_idempotency_uidx
  ON custom_package_requests (client_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS package_orders_client_idempotency_uidx
  ON package_orders (client_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Preserve commercial history when catalog/project rows are deleted.
ALTER TABLE package_orders DROP CONSTRAINT IF EXISTS package_orders_package_id_packages_id_fk;
ALTER TABLE package_orders
  ADD CONSTRAINT package_orders_package_id_packages_id_fk
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;

ALTER TABLE package_orders DROP CONSTRAINT IF EXISTS package_orders_project_id_projects_id_fk;
ALTER TABLE package_orders
  ADD CONSTRAINT package_orders_project_id_projects_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

ALTER TABLE custom_package_requests DROP CONSTRAINT IF EXISTS custom_package_requests_project_id_projects_id_fk;
ALTER TABLE custom_package_requests
  ADD CONSTRAINT custom_package_requests_project_id_projects_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

-- DB-enforced single active timer per user/workspace.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM time_entries
    WHERE end_time IS NULL AND manual_minutes IS NULL
    GROUP BY workspace_id, user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add active timer uniqueness: duplicate active timers exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS time_entries_one_active_per_user_workspace_uidx
  ON time_entries (workspace_id, user_id)
  WHERE end_time IS NULL AND manual_minutes IS NULL;

-- Invoice/time idempotency and reversible status metadata.
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS previous_time_entry_status text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_previous_time_entry_status_check') THEN
    ALTER TABLE invoice_items
      ADD CONSTRAINT invoice_items_previous_time_entry_status_check
      CHECK (previous_time_entry_status IS NULL OR previous_time_entry_status IN ('draft', 'approved'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM invoice_items
    WHERE source_type = 'time_entry' AND source_id IS NOT NULL
    GROUP BY source_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add invoice source uniqueness: duplicate time entry links exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_items_time_entry_source_uidx
  ON invoice_items (source_id)
  WHERE source_type = 'time_entry' AND source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoice_items_source_lookup_idx
  ON invoice_items (source_type, source_id);
