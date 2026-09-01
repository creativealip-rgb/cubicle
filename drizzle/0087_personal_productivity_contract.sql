ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text;

UPDATE users u SET timezone = COALESCE((
  SELECT w.timezone FROM workspaces w WHERE w.owner_id = u.id
  ORDER BY w.created_at ASC, w.id ASC LIMIT 1
), 'Asia/Jakarta') WHERE timezone IS NULL OR btrim(timezone) = '';

ALTER TABLE users ALTER COLUMN timezone SET DEFAULT 'Asia/Jakarta';
ALTER TABLE users ALTER COLUMN timezone SET NOT NULL;

CREATE FUNCTION personal_weekdays_valid(frequency text, weekdays smallint[])
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN frequency = 'daily' THEN weekdays = '{}'::smallint[]
    WHEN frequency = 'specific_weekdays' THEN cardinality(weekdays) > 0
      AND weekdays = ARRAY(SELECT DISTINCT x FROM unnest(weekdays) x ORDER BY x)
      AND NOT EXISTS (SELECT 1 FROM unnest(weekdays) x WHERE x < 0 OR x > 6)
    ELSE false
  END
$$;

CREATE TABLE personal_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
  title text NOT NULL, description text, life_area text NOT NULL, deadline date,
  priority text NOT NULL DEFAULT 'medium', reward text, status text NOT NULL DEFAULT 'not_started',
  manual_progress integer NOT NULL DEFAULT 0, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_goals_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT personal_goals_id_user_uq UNIQUE (id,user_id),
  CONSTRAINT personal_goals_title_ck CHECK (length(btrim(title)) > 0),
  CONSTRAINT personal_goals_life_area_ck CHECK (length(btrim(life_area)) > 0),
  CONSTRAINT personal_goals_priority_ck CHECK (priority IN ('low','medium','high')),
  CONSTRAINT personal_goals_status_ck CHECK (status IN ('not_started','in_progress','achieved','deferred','cancelled')),
  CONSTRAINT personal_goals_progress_ck CHECK (manual_progress BETWEEN 0 AND 100)
);
CREATE INDEX personal_goals_user_status_idx ON personal_goals(user_id,status);
CREATE INDEX personal_goals_user_deadline_idx ON personal_goals(user_id,deadline);

CREATE TABLE personal_goal_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), goal_id uuid NOT NULL, user_id text NOT NULL,
  title text NOT NULL, is_completed boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_goal_steps_goal_user_fk FOREIGN KEY (goal_id,user_id) REFERENCES personal_goals(id,user_id) ON DELETE CASCADE,
  CONSTRAINT personal_goal_steps_title_ck CHECK (length(btrim(title)) > 0)
);
CREATE INDEX personal_goal_steps_goal_sort_idx ON personal_goal_steps(goal_id,sort_order);

CREATE TABLE personal_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, goal_id uuid,
  name text NOT NULL, description text, color text, icon text,
  frequency text NOT NULL DEFAULT 'daily', weekdays smallint[] NOT NULL DEFAULT '{}', start_date date NOT NULL,
  status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_habits_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT personal_habits_id_user_uq UNIQUE (id,user_id),
  CONSTRAINT personal_habits_goal_user_fk FOREIGN KEY (goal_id,user_id) REFERENCES personal_goals(id,user_id) ON DELETE NO ACTION,
  CONSTRAINT personal_habits_name_ck CHECK (length(btrim(name)) > 0),
  CONSTRAINT personal_habits_frequency_ck CHECK (frequency IN ('daily','specific_weekdays')),
  CONSTRAINT personal_habits_status_ck CHECK (status IN ('active','archived')),
  CONSTRAINT personal_habits_schedule_ck CHECK (personal_weekdays_valid(frequency,weekdays))
);
CREATE INDEX personal_habits_user_status_idx ON personal_habits(user_id,status);
CREATE INDEX personal_habits_user_goal_idx ON personal_habits(user_id,goal_id);

CREATE TABLE personal_habit_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), habit_id uuid NOT NULL, user_id text NOT NULL,
  local_date date NOT NULL, note text, completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_habit_checkins_habit_user_fk FOREIGN KEY (habit_id,user_id) REFERENCES personal_habits(id,user_id) ON DELETE CASCADE,
  CONSTRAINT personal_habit_checkins_habit_date_uq UNIQUE (habit_id,local_date)
);
CREATE INDEX personal_habit_checkins_user_date_idx ON personal_habit_checkins(user_id,local_date);

CREATE TABLE personal_transaction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, name varchar(100) NOT NULL,
  color varchar(7) NOT NULL DEFAULT '#64748b', icon varchar(50), default_bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_categories_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT personal_categories_id_user_uq UNIQUE (id,user_id),
  CONSTRAINT personal_categories_name_ck CHECK (length(btrim(name)) > 0),
  CONSTRAINT personal_categories_color_ck CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT personal_categories_bucket_ck CHECK (default_bucket IN ('needs','wants','savings','unbudgeted'))
);
CREATE UNIQUE INDEX personal_categories_user_lower_name_uq ON personal_transaction_categories(user_id,lower(name));
CREATE INDEX personal_categories_user_name_idx ON personal_transaction_categories(user_id,name);

CREATE TABLE personal_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, category_id uuid,
  transaction_type text NOT NULL, budget_bucket text NOT NULL, amount numeric(18,2) NOT NULL,
  currency char(3) NOT NULL, date date NOT NULL, description varchar(500) NOT NULL, merchant varchar(200),
  receipt_key text, receipt_mime varchar(100), receipt_size_bytes bigint, receipt_checksum text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_transactions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT personal_transactions_id_user_uq UNIQUE (id,user_id),
  CONSTRAINT personal_transactions_category_user_fk FOREIGN KEY (category_id,user_id) REFERENCES personal_transaction_categories(id,user_id) ON DELETE NO ACTION,
  CONSTRAINT personal_transactions_type_ck CHECK (transaction_type IN ('expense','allocation')),
  CONSTRAINT personal_transactions_bucket_ck CHECK (budget_bucket IN ('needs','wants','savings','unbudgeted')),
  CONSTRAINT personal_transactions_type_bucket_ck CHECK ((transaction_type='allocation' AND budget_bucket='savings') OR (transaction_type='expense' AND budget_bucket IN ('needs','wants','unbudgeted'))),
  CONSTRAINT personal_transactions_amount_ck CHECK (amount > 0),
  CONSTRAINT personal_transactions_currency_ck CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT personal_transactions_description_ck CHECK (length(btrim(description)) > 0),
  CONSTRAINT personal_transactions_receipt_prefix_ck CHECK (receipt_key IS NULL OR receipt_key LIKE ('personal/' || user_id || '/receipts/' || id || '/%')),
  CONSTRAINT personal_transactions_receipt_metadata_ck CHECK ((receipt_key IS NULL AND receipt_mime IS NULL AND receipt_size_bytes IS NULL AND receipt_checksum IS NULL) OR (receipt_key IS NOT NULL AND receipt_mime IS NOT NULL AND receipt_size_bytes > 0 AND receipt_checksum IS NOT NULL))
);
CREATE INDEX personal_transactions_user_date_created_id_idx ON personal_transactions(user_id,date DESC,created_at DESC,id DESC);
CREATE INDEX personal_transactions_user_currency_date_idx ON personal_transactions(user_id,currency,date);

CREATE TABLE personal_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, month date NOT NULL, currency char(3) NOT NULL,
  income numeric(18,2) NOT NULL, needs_pct numeric(5,2) NOT NULL DEFAULT 50, wants_pct numeric(5,2) NOT NULL DEFAULT 30,
  savings_pct numeric(5,2) NOT NULL DEFAULT 20, enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_budgets_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT personal_budgets_id_user_uq UNIQUE (id,user_id),
  CONSTRAINT personal_budgets_user_month_currency_uq UNIQUE (user_id,month,currency),
  CONSTRAINT personal_budgets_month_ck CHECK (month = date_trunc('month',month)::date),
  CONSTRAINT personal_budgets_currency_ck CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT personal_budgets_income_ck CHECK (income > 0),
  CONSTRAINT personal_budgets_needs_pct_ck CHECK (needs_pct BETWEEN 0 AND 100),
  CONSTRAINT personal_budgets_wants_pct_ck CHECK (wants_pct BETWEEN 0 AND 100),
  CONSTRAINT personal_budgets_savings_pct_ck CHECK (savings_pct BETWEEN 0 AND 100),
  CONSTRAINT personal_budgets_percent_total_ck CHECK (needs_pct+wants_pct+savings_pct=100)
);
CREATE INDEX personal_budgets_user_month_currency_idx ON personal_budgets(user_id,month DESC,currency);

INSERT INTO cubiqlo_migrations (id,checksum,operator_name)
VALUES ('0087_personal_productivity_contract.sql','personal-productivity-phase0a',current_user)
ON CONFLICT (id) DO NOTHING;
