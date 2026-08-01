ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS source_mode text,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM invoice_items
    WHERE source_type = 'time_entry'
      AND source_id IS NOT NULL
    GROUP BY source_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate invoice_items time-entry source links found; resolve duplicates before migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_items_time_entry_source_uidx
  ON invoice_items (source_id)
  WHERE source_type = 'time_entry' AND source_id IS NOT NULL;

UPDATE invoice_items
SET source_mode = CASE
  WHEN source_type = 'time_entry' THEN 'hourly_timesheet'
  WHEN source_type = 'manual' THEN 'manual_adjustment'
  ELSE source_mode
END
WHERE source_mode IS NULL
  AND source_type IN ('time_entry', 'manual');
