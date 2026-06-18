-- Sprint T — Notifications + IDR default
-- 1. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  entity_type TEXT,
  entity_id UUID,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_workspace_created_idx
  ON notifications (workspace_id, created_at DESC);

-- 2. Switch demo workspace currency to IDR
UPDATE workspaces SET default_currency = 'IDR' WHERE slug = 'acme-creative';

-- 3. Add last_viewed_at to files (for Sprint R portal tracking)
ALTER TABLE files ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- 4. Portal visits audit table
CREATE TABLE IF NOT EXISTS portal_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_visits_resource_idx
  ON portal_visits (resource_type, resource_id, visited_at DESC);
