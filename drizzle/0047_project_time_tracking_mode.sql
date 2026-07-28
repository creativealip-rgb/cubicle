-- Phase 1: additive project-level time tracking policy.
-- Add nullable columns first so existing rows remain readable during backfill.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "time_tracking_mode" text,
  ADD COLUMN IF NOT EXISTS "activity_required" boolean;

-- Backfill fixed projects as internal cost tracking, hourly projects as billable,
-- and package projects as billable only when their selected package has hours.
WITH project_tracking_modes AS (
  SELECT
    p.id,
    CASE
      WHEN p.billing_type = 'hours' THEN 'billable'
      WHEN p.billing_type = 'package' AND pkg.hours > 0 THEN 'billable'
      ELSE 'internal'
    END AS time_tracking_mode
  FROM projects p
  LEFT JOIN packages pkg ON pkg.id = p.selected_package_id
)
UPDATE projects p
SET time_tracking_mode = modes.time_tracking_mode
FROM project_tracking_modes modes
WHERE p.id = modes.id
  AND p.time_tracking_mode IS NULL;

UPDATE projects
SET activity_required = false
WHERE activity_required IS NULL;

-- Safe DB fallback for direct inserts. Application create/update resolves billing-aware defaults.
ALTER TABLE projects
  ALTER COLUMN time_tracking_mode SET DEFAULT 'internal',
  ALTER COLUMN time_tracking_mode SET NOT NULL,
  ALTER COLUMN activity_required SET DEFAULT false,
  ALTER COLUMN activity_required SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_time_tracking_mode_check'
      AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_time_tracking_mode_check
      CHECK (time_tracking_mode IN ('off', 'internal', 'billable'));
  END IF;
END $$;
