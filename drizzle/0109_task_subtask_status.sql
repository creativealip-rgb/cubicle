ALTER TABLE task_subtasks ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo';
UPDATE task_subtasks SET status = 'done' WHERE completed = true;
