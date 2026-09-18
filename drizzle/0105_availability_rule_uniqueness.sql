-- Keep oldest exact availability slot and prevent duplicate recreation.
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY workspace_id, day_of_week, start_time, end_time, timezone
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM availability_rules
)
DELETE FROM availability_rules
WHERE id IN (SELECT id FROM ranked WHERE duplicate_rank > 1);

CREATE UNIQUE INDEX IF NOT EXISTS availability_rules_exact_slot_unique
  ON availability_rules (workspace_id, day_of_week, start_time, end_time, timezone);
