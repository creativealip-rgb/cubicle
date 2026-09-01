# Personal Productivity Phase 0A — Schema & Migration Contract

**Status:** review gate; no feature coding until artifacts and disposable-DB tests pass.
**Canonical product plan:** `docs/PERSONAL_PRODUCTIVITY_AND_503020_BUDGET_PLAN.md`
**Migration slot:** `0087_personal_productivity_contract.sql`, moved from the stale `0083` draft after MFA migrations `0083`–`0086` landed on `main`; re-check immediately before merge and fail on collision.

## Migration order

1. Add nullable `users.timezone`.
2. Backfill from earliest owned workspace (`workspaces.owner_id = users.id`, ordered by `created_at ASC, id ASC`), then `Asia/Jakarta`. Membership workspace lain tidak dipakai karena active workspace tidak durable.
3. Set default, `NOT NULL`, and IANA validation at application boundary.
4. Create immutable helper `personal_weekdays_valid(frequency text, weekdays smallint[])`.
5. Create parent tables: goals, habits, personal categories, budgets.
6. Create child tables: goal steps, habit check-ins, personal transactions.
7. Add named checks, composite ownership FKs, uniqueness, and indexes.
8. Run reconciliation SQL and disposable-DB behavioral tests.
9. Only then wire ORM schema/actions/UI.

No existing business Expense table changes. Migration is additive. Rollback during compatibility window means roll application back and leave additive objects in place; removal needs reviewed forward migration.

## Exact table contract

### `users`

Add `timezone text`. Repo belum memiliki timezone user-level. Backfill dari earliest owned workspace dengan urutan deterministik `created_at ASC, id ASC`; fallback `Asia/Jakarta`. Then `SET DEFAULT 'Asia/Jakarta'`, `SET NOT NULL`. Reconciliation wajib melaporkan jumlah row owner-workspace dan fallback.

### `personal_goals`

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- title/description/life_area/deadline/priority/reward/status/manual_progress/sort_order
- timestamps `timestamptz NOT NULL DEFAULT now()`
- `UNIQUE (id,user_id)`
- checks: nonblank title/life_area; priority enum; status enum; progress 0–100
- indexes `(user_id,status)`, `(user_id,deadline)`

### `personal_goal_steps`

- UUID PK; `goal_id uuid NOT NULL`; `user_id text NOT NULL`; title, completion state, order, timestamps
- composite FK `(goal_id,user_id)` to goals, cascade
- check nonblank title
- index `(goal_id,sort_order)`

### `personal_habits`

- UUID PK; user owner; nullable goal; name/description/color/icon
- frequency `daily|specific_weekdays`; `weekdays smallint[] NOT NULL DEFAULT '{}'`
- start date; status `active|archived`; timestamps
- `UNIQUE (id,user_id)`
- composite goal FK `(goal_id,user_id)` with `NO ACTION`
- helper CHECK guarantees daily empty array; specific weekdays non-empty, sorted, unique, values 0–6
- indexes `(user_id,status)`, `(user_id,goal_id)`

### `personal_habit_checkins`

- UUID PK; habit/user IDs; local date; optional note; completion timestamp
- composite habit FK, cascade
- unique `(habit_id,local_date)`
- index `(user_id,local_date)`
- before-start/future-local-date rules remain server behavioral checks because current date depends on user timezone

### `personal_transaction_categories`

- UUID PK; owner; `name varchar(100)`; hex color; optional icon; default bucket; timestamps
- `UNIQUE (id,user_id)`; unique index `(user_id,lower(name))`; index `(user_id,name)`
- default bucket enum; nonblank name; hex color check

### `personal_transactions`

- UUID PK; owner; nullable category; type; bucket; positive `numeric(18,2)` amount; currency; date; description; merchant; receipt key, MIME, positive byte size, checksum; timestamps
- composite category FK with `NO ACTION`
- type/bucket compatibility check: allocation only savings; expense never savings
- currency format check `[A-Z]{3}`; application whitelist provides ISO 4217 guarantee
- receipt key must be null or start with `personal/{user_id}/receipts/`; exact transaction-ID segment verified server-side
- receipt key null requires MIME/size/checksum null; non-null key requires all metadata present. Metadata is server-derived and used by object reconciliation.
- indexes `(user_id,date DESC,created_at DESC,id DESC)` and `(user_id,currency,date)`

### `personal_budgets`

- UUID PK; owner; first-day month; currency; positive `numeric(18,2)` income
- non-null percentage defaults 50/30/20; enabled; timestamps
- unique `(user_id,month,currency)` and `(id,user_id)`
- checks: first day month; currency format; each percentage 0–100; sum exactly 100
- index `(user_id,month DESC,currency)`

## Named object ledger

Setiap FK, UNIQUE, CHECK, dan index harus bernama eksplisit dalam migration dan Drizzle. Minimum ledger:

- Goals: `personal_goals_user_fk`, `personal_goals_id_user_uq`, `personal_goals_title_ck`, `personal_goals_life_area_ck`, `personal_goals_priority_ck`, `personal_goals_status_ck`, `personal_goals_progress_ck`, `personal_goals_user_status_idx`, `personal_goals_user_deadline_idx`.
- Goal steps: `personal_goal_steps_goal_user_fk`, `personal_goal_steps_title_ck`, `personal_goal_steps_goal_sort_idx`.
- Habits: `personal_habits_user_fk`, `personal_habits_id_user_uq`, `personal_habits_goal_user_fk`, `personal_habits_name_ck`, `personal_habits_frequency_ck`, `personal_habits_status_ck`, `personal_habits_schedule_ck`, `personal_habits_user_status_idx`, `personal_habits_user_goal_idx`.
- Check-ins: `personal_habit_checkins_habit_user_fk`, `personal_habit_checkins_habit_date_uq`, `personal_habit_checkins_user_date_idx`.
- Categories: `personal_categories_user_fk`, `personal_categories_id_user_uq`, `personal_categories_user_lower_name_uq`, `personal_categories_user_name_idx`, `personal_categories_name_ck`, `personal_categories_color_ck`, `personal_categories_bucket_ck`.
- Transactions: `personal_transactions_user_fk`, `personal_transactions_id_user_uq`, `personal_transactions_category_user_fk`, `personal_transactions_type_ck`, `personal_transactions_bucket_ck`, `personal_transactions_type_bucket_ck`, `personal_transactions_amount_ck`, `personal_transactions_currency_ck`, `personal_transactions_description_ck`, `personal_transactions_receipt_prefix_ck`, `personal_transactions_receipt_metadata_ck`, `personal_transactions_user_date_created_id_idx`, `personal_transactions_user_currency_date_idx`.
- Budgets: `personal_budgets_user_fk`, `personal_budgets_id_user_uq`, `personal_budgets_user_month_currency_uq`, `personal_budgets_month_ck`, `personal_budgets_currency_ck`, `personal_budgets_income_ck`, `personal_budgets_needs_pct_ck`, `personal_budgets_wants_pct_ck`, `personal_budgets_savings_pct_ck`, `personal_budgets_percent_total_ck`, `personal_budgets_user_month_currency_idx`.

## Transaction boundaries

- Delete goal: one DB transaction; lock goal by `(id,user_id)`, null same-user habit links, delete goal.
- Delete category: one DB transaction; lock category, null same-user transaction links, delete category.
- Copy budget: reject source=target; read source by session owner; serialize target `(user_id,month,currency)` with transaction-scoped advisory lock; insert if absent, atomic update if `replace=true`, otherwise conflict. Copy income and percentages; target month/currency come from request; reset `enabled=true`. Concurrent replace requests end with one row and last lock holder's complete values, never mixed fields.
- Check-in toggle: insert uses unique constraint/idempotent conflict handling; toggle-off deletes by habit, date, and session user.
- Receipt object write: row exists first. Upload failure leaves DB unchanged. Upload success + DB update failure deletes new object. Replace commits DB pointer to new object before deleting old object. Old-object cleanup failure is recorded and retried; it does not roll DB back to a pointer whose new object already exists. Delete transaction clears/deletes authorized row first, then cleanup is idempotently retried.

## ORM parity gate

`src/db/schema.ts` must use matching types and explicit named `foreignKey`, `unique`, `uniqueIndex`, `index`, and `check` definitions. SQL migration and Drizzle schema are reviewed as one change. No feature action merges while parity test reports missing object names.
