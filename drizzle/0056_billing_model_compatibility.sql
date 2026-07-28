ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS billing_model text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_billing_model_check'
      AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_billing_model_check
      CHECK (billing_model IN ('fixed_price', 'hourly', 'retainer', 'legacy_package'));
  END IF;
END $$;

UPDATE projects
SET billing_model = CASE
  WHEN billing_type = 'project' THEN 'fixed_price'
  WHEN billing_type = 'hours' THEN 'hourly'
  WHEN billing_type = 'package' THEN 'legacy_package'
END
WHERE billing_model IS NULL;

CREATE INDEX IF NOT EXISTS projects_workspace_billing_model_idx
  ON projects(workspace_id, billing_model);
