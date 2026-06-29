CREATE TABLE IF NOT EXISTS email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_messages_workspace_created_idx ON email_messages(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_messages_client_idx ON email_messages(client_id);

CREATE TABLE IF NOT EXISTS personal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'open',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_notes_user_created_idx ON personal_notes(workspace_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS personal_notes_user_status_idx ON personal_notes(workspace_id, user_id, status);
