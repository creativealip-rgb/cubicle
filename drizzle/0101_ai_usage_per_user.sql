ALTER TABLE ai_usage_daily ADD COLUMN IF NOT EXISTS user_id text;

UPDATE ai_usage_daily AS usage
SET user_id = workspaces.owner_id
FROM workspaces
WHERE usage.workspace_id = workspaces.id
  AND usage.user_id IS NULL;

-- One user may own multiple workspaces. Merge historical rows per user/month,
-- preserving total usage on the oldest row before adding the unique index.
WITH ranked AS (
  SELECT ctid,
         row_number() OVER (PARTITION BY user_id, usage_date ORDER BY workspace_id, ctid) AS rn,
         sum(count) OVER (PARTITION BY user_id, usage_date) AS total_count
  FROM ai_usage_daily
), updated AS (
  UPDATE ai_usage_daily AS usage
  SET count = ranked.total_count
  FROM ranked
  WHERE usage.ctid = ranked.ctid AND ranked.rn = 1
)
DELETE FROM ai_usage_daily AS usage
USING ranked
WHERE usage.ctid = ranked.ctid AND ranked.rn > 1;

ALTER TABLE ai_usage_daily ALTER COLUMN user_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE ai_usage_daily
    ADD CONSTRAINT ai_usage_daily_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ai_usage_daily DROP CONSTRAINT IF EXISTS ai_usage_daily_ws_date;
DROP INDEX IF EXISTS ai_usage_daily_ws_date;

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_daily_user_date_uidx
  ON ai_usage_daily (user_id, usage_date);
CREATE INDEX IF NOT EXISTS ai_usage_daily_workspace_idx
  ON ai_usage_daily (workspace_id);

-- ponytail: historical workspace usage stays charged to owner; no attempt to infer past member attribution.
