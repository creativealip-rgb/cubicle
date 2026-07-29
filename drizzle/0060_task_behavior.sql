ALTER TABLE tasks ADD COLUMN IF NOT EXISTS behavior text, ADD COLUMN IF NOT EXISTS archived_at timestamptz;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tasks_behavior_check') THEN ALTER TABLE tasks ADD CONSTRAINT tasks_behavior_check CHECK (behavior IS NULL OR behavior IN ('one_time','recurring')); END IF; END $$;
UPDATE tasks t SET behavior=CASE p.billing_model WHEN 'fixed_price' THEN 'one_time' WHEN 'hourly' THEN 'recurring' WHEN 'retainer' THEN 'recurring' ELSE NULL END FROM projects p WHERE t.project_id=p.id AND t.behavior IS NULL;
