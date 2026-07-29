-- Billing-aware Phase 9 destructive cleanup
-- Scope: remove obsolete Package and Activity catalog dependencies only after backup,
-- reconciliation, and dry-run. Service schema remains intentionally untouched.

-- Remove dependent FKs while preserving historical ledger rows/snapshots.
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_activity_workspace_fk;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_selected_package_id_fkey;
ALTER TABLE project_services DROP CONSTRAINT IF EXISTS project_services_package_item_workspace_fk;
ALTER TABLE project_services DROP CONSTRAINT IF EXISTS project_services_project_package_assignment_workspace_fk;
ALTER TABLE project_services DROP CONSTRAINT IF EXISTS project_services_source_package_assignment_workspace_fk;
ALTER TABLE package_orders DROP CONSTRAINT IF EXISTS package_orders_package_id_packages_id_fk;
ALTER TABLE package_orders DROP CONSTRAINT IF EXISTS package_orders_project_package_assignment_workspace_fk;

-- Remove legacy active selectors/pointers. Snapshot text/amount columns remain.
ALTER TABLE time_entries DROP COLUMN IF EXISTS activity_id;
ALTER TABLE projects DROP COLUMN IF EXISTS selected_package_id;
ALTER TABLE project_services DROP COLUMN IF EXISTS package_item_id;
ALTER TABLE project_services DROP COLUMN IF EXISTS project_package_assignment_id;
ALTER TABLE project_services DROP COLUMN IF EXISTS source_package_assignment_id;
ALTER TABLE package_orders DROP COLUMN IF EXISTS package_id;
ALTER TABLE package_orders DROP COLUMN IF EXISTS project_package_assignment_id;

-- Drop legacy Package/Activity catalog tables after dependencies are clear.
DROP TABLE IF EXISTS project_activities;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS project_package_assignments;
DROP TABLE IF EXISTS package_items;
DROP TABLE IF EXISTS packages;
