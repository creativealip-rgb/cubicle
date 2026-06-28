ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_slug text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_slug_enabled boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS clients_portal_slug_unique ON clients (portal_slug) WHERE portal_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS portal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'document' CHECK (type IN ('document','approval','info','other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  due_date date,
  completed_at timestamptz,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_requests_workspace_idx ON portal_requests(workspace_id);
CREATE INDEX IF NOT EXISTS portal_requests_client_idx ON portal_requests(client_id);
CREATE INDEX IF NOT EXISTS portal_requests_project_idx ON portal_requests(project_id);
CREATE INDEX IF NOT EXISTS portal_requests_status_idx ON portal_requests(status, due_date);
