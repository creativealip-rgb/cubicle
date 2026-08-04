-- Migration 0069: Add performance indexes for time_entries and invoices
CREATE INDEX IF NOT EXISTS "time_entries_workspace_user_work_date_idx" 
  ON "time_entries" ("workspace_id", "user_id", "work_date");

CREATE INDEX IF NOT EXISTS "time_entries_workspace_project_status_idx" 
  ON "time_entries" ("workspace_id", "project_id", "status");

CREATE INDEX IF NOT EXISTS "invoices_workspace_client_status_idx" 
  ON "invoices" ("workspace_id", "client_id", "status");

CREATE INDEX IF NOT EXISTS "invoices_workspace_status_issue_date_idx" 
  ON "invoices" ("workspace_id", "status", "issue_date");
