-- Migration 0078: single default template per workspace (proposal + contract)
-- seedDefaultTemplates() has a check-then-insert race: two parallel workspace-
-- creation calls (e.g. concurrent requests on first login) both observe "no
-- default yet" and both insert, producing duplicate defaults. Enforce the
-- invariant at the DB level with a partial unique index (one default per
-- workspace, per template type), then dedupe any existing rows.

-- 1. Dedupe existing duplicate defaults (keep the lowest id per workspace).
DELETE FROM proposal_templates a
USING proposal_templates b
WHERE a.workspace_id = b.workspace_id
  AND a.is_default = true
  AND b.is_default = true
  AND a.id > b.id;

DELETE FROM contract_templates a
USING contract_templates b
WHERE a.workspace_id = b.workspace_id
  AND a.is_default = true
  AND b.is_default = true
  AND a.id > b.id;

-- 2. Partial unique indexes: at most one default per workspace, per type.
CREATE UNIQUE INDEX IF NOT EXISTS proposal_templates_one_default_per_ws_uidx
  ON proposal_templates (workspace_id)
  WHERE is_default = true;

CREATE UNIQUE INDEX IF NOT EXISTS contract_templates_one_default_per_ws_uidx
  ON contract_templates (workspace_id)
  WHERE is_default = true;
