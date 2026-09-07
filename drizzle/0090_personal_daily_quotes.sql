CREATE TABLE IF NOT EXISTS personal_daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  quote text NOT NULL,
  attribution text,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_daily_quotes_source_ck CHECK (source IN ('ai','fallback')),
  CONSTRAINT personal_daily_quotes_quote_ck CHECK (length(btrim(quote)) BETWEEN 1 AND 240),
  CONSTRAINT personal_daily_quotes_attribution_ck CHECK (attribution IS NULL OR length(attribution) <= 60)
);
CREATE UNIQUE INDEX IF NOT EXISTS personal_daily_quotes_user_date_unique ON personal_daily_quotes(user_id, local_date);
INSERT INTO cubiqlo_migrations (id,checksum,operator_name)
VALUES ('0090_personal_daily_quotes.sql','personal-daily-quotes-v1',current_user)
ON CONFLICT (id) DO NOTHING;
