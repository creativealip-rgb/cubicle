ALTER TABLE project_services
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS cost_rate_snapshot numeric(12,2);

ALTER TABLE project_services
  ADD CONSTRAINT project_services_estimated_minutes_check CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
  ADD CONSTRAINT project_services_cost_rate_snapshot_check CHECK (cost_rate_snapshot IS NULL OR cost_rate_snapshot >= 0);

CREATE TABLE IF NOT EXISTS client_service_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL,
  hourly_rate numeric(12,2) NOT NULL CHECK (hourly_rate >= 0),
  currency text NOT NULL DEFAULT 'IDR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_service_rate_cards_client_service_unique UNIQUE (client_id, service_id),
  CONSTRAINT client_service_rate_cards_service_workspace_fk FOREIGN KEY (service_id, workspace_id) REFERENCES services(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS client_service_rate_cards_workspace_client_idx ON client_service_rate_cards(workspace_id, client_id);
