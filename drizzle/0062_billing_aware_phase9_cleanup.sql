-- Billing-aware Phase 9 destructive cleanup
-- Scope: remove obsolete Package and Activity catalog dependencies only after backup,
-- reconciliation, and dry-run. Service schema remains intentionally untouched.

BEGIN;

-- Remove legacy Activity FK from time entries while preserving historical rows.
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_activity_workspace_fk;
ALTER TABLE time_entries DROP COLUMN IF EXISTS activity_id;

-- Remove legacy Package project pointer after classification cutover.
ALTER TABLE projects DROP COLUMN IF EXISTS selected_package_id;

-- Drop legacy Package/Activity catalog tables after dependencies are clear.
DROP TABLE IF EXISTS project_activities;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS project_package_assignments;
DROP TABLE IF EXISTS package_items;
DROP TABLE IF EXISTS packages;

COMMIT;
