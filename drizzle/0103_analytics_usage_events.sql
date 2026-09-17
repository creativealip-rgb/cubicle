DO $$
BEGIN
  ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS analytics_events_name_check;
  ALTER TABLE analytics_events
    ADD CONSTRAINT analytics_events_name_check
    CHECK (event_name IN (
      'landing_viewed',
      'signup_started',
      'signup_completed',
      'activation_client_created',
      'activation_project_created',
      'activation_meaningful_activity',
      'page_viewed',
      'feature_used'
    ));
END $$;

CREATE INDEX IF NOT EXISTS analytics_events_page_time_idx
  ON analytics_events ((metadata->>'path'), occurred_at)
  WHERE event_name = 'page_viewed';

SELECT 1;
