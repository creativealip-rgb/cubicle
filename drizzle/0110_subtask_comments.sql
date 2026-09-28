ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS subtask_id uuid REFERENCES task_subtasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS task_comments_subtask_idx ON task_comments(subtask_id);
