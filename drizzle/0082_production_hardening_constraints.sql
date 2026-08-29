DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check"
    CHECK ("status" IN ('todo', 'in_progress', 'review', 'done'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;