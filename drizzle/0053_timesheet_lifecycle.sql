ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_status_check;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_status_check
  CHECK (status IN ('draft','submitted','approved','rejected','invoiced'));
