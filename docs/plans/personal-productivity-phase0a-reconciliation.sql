-- Personal Productivity Phase 0A reconciliation.
-- Read-only. Run after migration on disposable clone, dev, and before release.
\set ON_ERROR_STOP on

SELECT 'users_timezone_null_or_blank' AS check_name, count(*) AS violations
FROM users WHERE timezone IS NULL OR btrim(timezone) = '';

WITH ranked_owned_workspace AS (
  SELECT owner_id AS user_id, timezone,
         row_number() OVER (PARTITION BY owner_id ORDER BY created_at ASC, id ASC) AS rn
  FROM workspaces
)
SELECT CASE WHEN r.user_id IS NULL THEN 'fallback_asia_jakarta' ELSE 'owner_workspace' END AS timezone_source,
       count(*) AS users
FROM users u
LEFT JOIN ranked_owned_workspace r ON r.user_id=u.id AND r.rn=1
GROUP BY 1 ORDER BY 1;

SELECT 'personal_goals' AS entity, count(*) AS rows FROM personal_goals
UNION ALL SELECT 'personal_goal_steps', count(*) FROM personal_goal_steps
UNION ALL SELECT 'personal_habits', count(*) FROM personal_habits
UNION ALL SELECT 'personal_habit_checkins', count(*) FROM personal_habit_checkins
UNION ALL SELECT 'personal_transaction_categories', count(*) FROM personal_transaction_categories
UNION ALL SELECT 'personal_transactions', count(*) FROM personal_transactions
UNION ALL SELECT 'personal_budgets', count(*) FROM personal_budgets
ORDER BY entity;

SELECT 'goal_missing_user' AS check_name, count(*) AS violations
FROM personal_goals x LEFT JOIN users u ON u.id=x.user_id WHERE u.id IS NULL
UNION ALL SELECT 'step_orphan_or_owner_mismatch', count(*)
FROM personal_goal_steps x LEFT JOIN personal_goals p ON p.id=x.goal_id AND p.user_id=x.user_id WHERE p.id IS NULL
UNION ALL SELECT 'habit_missing_user', count(*)
FROM personal_habits x LEFT JOIN users u ON u.id=x.user_id WHERE u.id IS NULL
UNION ALL SELECT 'habit_goal_or_owner_mismatch', count(*)
FROM personal_habits x LEFT JOIN personal_goals p ON p.id=x.goal_id AND p.user_id=x.user_id
WHERE x.goal_id IS NOT NULL AND p.id IS NULL
UNION ALL SELECT 'checkin_orphan_or_owner_mismatch', count(*)
FROM personal_habit_checkins x LEFT JOIN personal_habits p ON p.id=x.habit_id AND p.user_id=x.user_id WHERE p.id IS NULL
UNION ALL SELECT 'category_missing_user', count(*)
FROM personal_transaction_categories x LEFT JOIN users u ON u.id=x.user_id WHERE u.id IS NULL
UNION ALL SELECT 'transaction_missing_user', count(*)
FROM personal_transactions x LEFT JOIN users u ON u.id=x.user_id WHERE u.id IS NULL
UNION ALL SELECT 'transaction_category_or_owner_mismatch', count(*)
FROM personal_transactions x LEFT JOIN personal_transaction_categories p ON p.id=x.category_id AND p.user_id=x.user_id
WHERE x.category_id IS NOT NULL AND p.id IS NULL
UNION ALL SELECT 'budget_missing_user', count(*)
FROM personal_budgets x LEFT JOIN users u ON u.id=x.user_id WHERE u.id IS NULL;

SELECT 'goal_invalid_priority_status_progress' AS check_name, count(*) AS violations
FROM personal_goals WHERE priority NOT IN ('low','medium','high') OR status NOT IN ('not_started','in_progress','achieved','deferred','cancelled') OR manual_progress NOT BETWEEN 0 AND 100
UNION ALL SELECT 'habit_invalid_status_frequency_schedule', count(*)
FROM personal_habits WHERE status NOT IN ('active','archived') OR NOT personal_weekdays_valid(frequency,weekdays)
UNION ALL SELECT 'category_invalid_bucket', count(*)
FROM personal_transaction_categories WHERE default_bucket NOT IN ('needs','wants','savings','unbudgeted')
UNION ALL SELECT 'transaction_invalid_type_bucket', count(*)
FROM personal_transactions WHERE NOT ((transaction_type='allocation' AND budget_bucket='savings') OR (transaction_type='expense' AND budget_bucket IN ('needs','wants','unbudgeted')))
UNION ALL SELECT 'transaction_invalid_amount_currency', count(*)
FROM personal_transactions WHERE amount <= 0 OR currency !~ '^[A-Z]{3}$'
UNION ALL SELECT 'budget_invalid_period_currency_amount', count(*)
FROM personal_budgets WHERE month <> date_trunc('month',month)::date OR currency !~ '^[A-Z]{3}$' OR income <= 0
UNION ALL SELECT 'budget_invalid_percentages', count(*)
FROM personal_budgets WHERE needs_pct NOT BETWEEN 0 AND 100 OR wants_pct NOT BETWEEN 0 AND 100 OR savings_pct NOT BETWEEN 0 AND 100 OR needs_pct+wants_pct+savings_pct <> 100;

SELECT 'duplicate_checkin' AS check_name, count(*) AS violations FROM (
 SELECT habit_id,local_date FROM personal_habit_checkins GROUP BY 1,2 HAVING count(*)>1
) q
UNION ALL SELECT 'duplicate_category_casefold', count(*) FROM (
 SELECT user_id,lower(name) FROM personal_transaction_categories GROUP BY 1,2 HAVING count(*)>1
) q
UNION ALL SELECT 'duplicate_budget_period', count(*) FROM (
 SELECT user_id,month,currency FROM personal_budgets GROUP BY 1,2,3 HAVING count(*)>1
) q;

SELECT 'invalid_receipt_prefix' AS check_name, count(*) AS violations
FROM personal_transactions
WHERE receipt_key IS NOT NULL AND receipt_key NOT LIKE ('personal/' || user_id || '/receipts/%');

-- Mechanical runner must fail when either query returns rows.
WITH expected(name) AS (VALUES
 ('personal_goals_user_fk'),('personal_goals_id_user_uq'),('personal_goals_title_ck'),('personal_goals_life_area_ck'),('personal_goals_priority_ck'),('personal_goals_status_ck'),('personal_goals_progress_ck'),
 ('personal_goal_steps_goal_user_fk'),('personal_goal_steps_title_ck'),
 ('personal_habits_user_fk'),('personal_habits_id_user_uq'),('personal_habits_goal_user_fk'),('personal_habits_name_ck'),('personal_habits_frequency_ck'),('personal_habits_status_ck'),('personal_habits_schedule_ck'),
 ('personal_habit_checkins_habit_user_fk'),('personal_habit_checkins_habit_date_uq'),
 ('personal_categories_user_fk'),('personal_categories_id_user_uq'),('personal_categories_name_ck'),('personal_categories_color_ck'),('personal_categories_bucket_ck'),
 ('personal_transactions_user_fk'),('personal_transactions_id_user_uq'),('personal_transactions_category_user_fk'),('personal_transactions_type_ck'),('personal_transactions_bucket_ck'),('personal_transactions_type_bucket_ck'),('personal_transactions_amount_ck'),('personal_transactions_currency_ck'),('personal_transactions_description_ck'),('personal_transactions_receipt_prefix_ck'),('personal_transactions_receipt_metadata_ck'),
 ('personal_receipt_cleanup_queue_user_id_fkey'),('personal_receipt_cleanup_queue_key_uq'),('personal_receipt_cleanup_queue_prefix_ck'),('personal_receipt_cleanup_queue_attempts_ck'),
 ('personal_budgets_user_fk'),('personal_budgets_id_user_uq'),('personal_budgets_user_month_currency_uq'),('personal_budgets_month_ck'),('personal_budgets_currency_ck'),('personal_budgets_income_ck'),('personal_budgets_needs_pct_ck'),('personal_budgets_wants_pct_ck'),('personal_budgets_savings_pct_ck'),('personal_budgets_percent_total_ck')
)
SELECT 'missing_constraint' AS check_name, e.name
FROM expected e LEFT JOIN pg_constraint c ON c.conname=e.name
WHERE c.conname IS NULL ORDER BY e.name;

WITH expected(name) AS (VALUES
 ('personal_goals_user_status_idx'),('personal_goals_user_deadline_idx'),('personal_goal_steps_goal_sort_idx'),
 ('personal_habits_user_status_idx'),('personal_habits_user_goal_idx'),('personal_habit_checkins_user_date_idx'),
 ('personal_categories_user_lower_name_uq'),('personal_categories_user_name_idx'),('personal_transactions_user_date_created_id_idx'),
 ('personal_transactions_user_currency_date_idx'),('personal_receipt_cleanup_queue_due_idx'),('personal_receipt_cleanup_queue_key_uq'),('personal_budgets_user_month_currency_idx')
)
SELECT 'missing_index' AS check_name, e.name
FROM expected e LEFT JOIN pg_indexes i ON i.schemaname=current_schema() AND i.indexname=e.name
WHERE i.indexname IS NULL ORDER BY e.name;

-- Reverse comparison detects managed objects absent from expected ledger.
WITH expected(name) AS (VALUES
 ('personal_goals_user_fk'),('personal_goals_id_user_uq'),('personal_goals_title_ck'),('personal_goals_life_area_ck'),('personal_goals_priority_ck'),('personal_goals_status_ck'),('personal_goals_progress_ck'),
 ('personal_goal_steps_goal_user_fk'),('personal_goal_steps_title_ck'),('personal_habits_user_fk'),('personal_habits_id_user_uq'),('personal_habits_goal_user_fk'),('personal_habits_name_ck'),('personal_habits_frequency_ck'),('personal_habits_status_ck'),('personal_habits_schedule_ck'),
 ('personal_habit_checkins_habit_user_fk'),('personal_habit_checkins_habit_date_uq'),('personal_categories_user_fk'),('personal_categories_id_user_uq'),('personal_categories_name_ck'),('personal_categories_color_ck'),('personal_categories_bucket_ck'),
 ('personal_transactions_user_fk'),('personal_transactions_id_user_uq'),('personal_transactions_category_user_fk'),('personal_transactions_type_ck'),('personal_transactions_bucket_ck'),('personal_transactions_type_bucket_ck'),('personal_transactions_amount_ck'),('personal_transactions_currency_ck'),('personal_transactions_description_ck'),('personal_transactions_receipt_prefix_ck'),('personal_transactions_receipt_metadata_ck'),
 ('personal_receipt_cleanup_queue_user_id_fkey'),('personal_receipt_cleanup_queue_key_uq'),('personal_receipt_cleanup_queue_prefix_ck'),('personal_receipt_cleanup_queue_attempts_ck'),
 ('personal_budgets_user_fk'),('personal_budgets_id_user_uq'),('personal_budgets_user_month_currency_uq'),('personal_budgets_month_ck'),('personal_budgets_currency_ck'),('personal_budgets_income_ck'),('personal_budgets_needs_pct_ck'),('personal_budgets_wants_pct_ck'),('personal_budgets_savings_pct_ck'),('personal_budgets_percent_total_ck')
), managed AS (
 SELECT c.conname AS name FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
 WHERE t.relname LIKE 'personal_%' AND c.contype <> 'p'
)
SELECT 'unexpected_constraint' AS check_name, m.name
FROM managed m LEFT JOIN expected e USING(name) WHERE e.name IS NULL ORDER BY m.name;

WITH expected(name) AS (VALUES
 ('personal_goals_user_status_idx'),('personal_goals_user_deadline_idx'),('personal_goal_steps_goal_sort_idx'),('personal_habits_user_status_idx'),('personal_habits_user_goal_idx'),('personal_habit_checkins_user_date_idx'),('personal_categories_user_lower_name_uq'),('personal_categories_user_name_idx'),('personal_transactions_user_date_created_id_idx'),('personal_transactions_user_currency_date_idx'),('personal_receipt_cleanup_queue_due_idx'),('personal_receipt_cleanup_queue_key_uq'),('personal_budgets_user_month_currency_idx')
), managed AS (
 SELECT indexname AS name FROM pg_indexes WHERE schemaname=current_schema()
 AND tablename LIKE 'personal_%' AND indexname !~ '(_pkey|_id_user_uq|_habit_date_uq|_user_month_currency_uq)$'
)
SELECT 'unexpected_index' AS check_name, m.name
FROM managed m LEFT JOIN expected e USING(name) WHERE e.name IS NULL ORDER BY m.name;
