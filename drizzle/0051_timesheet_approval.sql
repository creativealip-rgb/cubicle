CREATE TABLE IF NOT EXISTS timesheet_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected')),
  submitter_note text,
  review_note text,
  total_minutes integer NOT NULL DEFAULT 0 CHECK (total_minutes >= 0),
  billable_minutes integer NOT NULL DEFAULT 0 CHECK (billable_minutes >= 0),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timesheet_submissions_workspace_user_week_unique UNIQUE(workspace_id,user_id,week_start)
);
CREATE INDEX IF NOT EXISTS timesheet_submissions_workspace_week_idx ON timesheet_submissions(workspace_id,week_start,status);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cubiqlo_dev') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON timesheet_submissions TO cubiqlo_dev;
  END IF;
END $$;
