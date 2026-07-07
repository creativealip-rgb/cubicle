ALTER TABLE personal_notes ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE personal_notes ADD COLUMN IF NOT EXISTS recurrence_rule text NOT NULL DEFAULT 'none';
ALTER TABLE personal_notes ADD COLUMN IF NOT EXISTS notify_7d boolean NOT NULL DEFAULT false;
ALTER TABLE personal_notes ADD COLUMN IF NOT EXISTS notify_3d boolean NOT NULL DEFAULT false;
ALTER TABLE personal_notes ADD COLUMN IF NOT EXISTS notify_1d boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS personal_notes_due_idx ON personal_notes(workspace_id, user_id, due_date) WHERE due_date IS NOT NULL;
