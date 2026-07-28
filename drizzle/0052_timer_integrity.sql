ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'timer',
  ADD COLUMN IF NOT EXISTS work_date date,
  ADD COLUMN IF NOT EXISTS timezone_snapshot text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS currency_snapshot text NOT NULL DEFAULT 'IDR';

ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_entry_type_check;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_entry_type_check CHECK (entry_type IN ('timer','duration'));

UPDATE time_entries
SET entry_type = 'duration',
    work_date = COALESCE(work_date, start_time::date)
WHERE manual_minutes IS NOT NULL;

CREATE TABLE IF NOT EXISTS timer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  time_entry_id uuid NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS timer_segments_entry_started_idx ON timer_segments(time_entry_id, started_at);
CREATE UNIQUE INDEX IF NOT EXISTS timer_segments_one_open_per_entry_uidx ON timer_segments(time_entry_id) WHERE ended_at IS NULL;

INSERT INTO timer_segments (workspace_id, time_entry_id, started_at, ended_at)
SELECT workspace_id, id, start_time, COALESCE(paused_at, end_time)
FROM time_entries
WHERE entry_type = 'timer' AND start_time IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM timer_segments s WHERE s.time_entry_id = time_entries.id);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cubiqlo_dev') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON timer_segments TO cubiqlo_dev;
  END IF;
END $$;
