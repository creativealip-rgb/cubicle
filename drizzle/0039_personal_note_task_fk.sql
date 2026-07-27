ALTER TABLE personal_notes
  DROP CONSTRAINT IF EXISTS personal_notes_converted_task_id_tasks_id_fk;

ALTER TABLE personal_notes
  ADD CONSTRAINT personal_notes_converted_task_id_tasks_id_fk
  FOREIGN KEY (converted_task_id) REFERENCES tasks(id) ON DELETE SET NULL;