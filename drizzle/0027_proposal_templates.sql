CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT,
  default_currency TEXT NOT NULL DEFAULT 'IDR',
  default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT '0',
  default_down_payment_percent NUMERIC(5,2) NOT NULL DEFAULT '50',
  line_items TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_templates_workspace ON proposal_templates(workspace_id);
