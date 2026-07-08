-- Add 'package' to billing_type enum (text column, no enum constraint in DB, but update default)
-- billing_type is a text column so no ALTER TYPE needed

-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  hours integer,
  price numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'IDR',
  description text,
  features text,
  badge text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS packages_project_idx ON packages(project_id);
CREATE INDEX IF NOT EXISTS packages_workspace_idx ON packages(workspace_id);
