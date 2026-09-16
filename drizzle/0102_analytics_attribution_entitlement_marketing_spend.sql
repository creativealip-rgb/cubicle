CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  anonymous_id text,
  session_id text,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  source text, medium text, campaign text, term text, content text, referrer text, referral_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT analytics_events_name_check CHECK (event_name IN ('landing_viewed','signup_started','signup_completed','activation_client_created','activation_project_created','activation_meaningful_activity')),
  CONSTRAINT analytics_events_metadata_size CHECK (pg_column_size(metadata) <= 8192)
);
CREATE INDEX IF NOT EXISTS analytics_events_name_time_idx ON analytics_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_anon_time_idx ON analytics_events(anonymous_id, occurred_at);
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text REFERENCES users(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL, event_type text NOT NULL,
  from_plan text, to_plan text, amount numeric(12,2), billing_period text, provider_order_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT subscription_events_type_check CHECK (event_type IN ('started','renewed','upgraded','downgraded','expired','reactivated')),
  UNIQUE (provider_order_id, event_type)
);
CREATE TABLE IF NOT EXISTS marketing_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), spend_date date NOT NULL, source text NOT NULL, campaign text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0), currency text NOT NULL DEFAULT 'IDR', notes text,
  created_by text REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spend_date, source, campaign, currency)
);
CREATE INDEX IF NOT EXISTS marketing_spend_date_idx ON marketing_spend(spend_date); 
SELECT 1;
--------------------------------------------------------------------------------
-- No historical visitor or attribution backfill: unavailable facts remain unavailable.
--------------------------------------------------------------------------------
