#!/usr/bin/env bash
set -euo pipefail
name="cubicle_phase0a_it_${$}"
port=""
cleanup(){ docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --rm --name "$name" -e POSTGRES_PASSWORD=test -e POSTGRES_DB="$name" -p 127.0.0.1::5432 -d postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do port=$(docker port "$name" 5432/tcp 2>/dev/null | sed 's/.*://'); PGPASSWORD=test psql -h 127.0.0.1 -p "$port" -U postgres -d "$name" -Atqc 'select 1' >/dev/null 2>&1 && break; sleep .2; done
url="postgresql://postgres:test@127.0.0.1:${port}/${name}"
psqlx(){ PGPASSWORD=test psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$port" -U postgres -d "$name" "$@"; }
psqlx -q <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE users(id text PRIMARY KEY);
CREATE TABLE workspaces(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id text NOT NULL REFERENCES users(id),timezone text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE cubiqlo_migrations(id text PRIMARY KEY,checksum text NOT NULL,operator_name text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO users(id) VALUES ('a'),('b');
INSERT INTO workspaces(owner_id,timezone,created_at) VALUES ('a','UTC','2026-01-02'),('a','Asia/Jakarta','2026-01-01');
SQL
apply(){ if [[ "$(psqlx -Atqc "select count(*) from cubiqlo_migrations where id='0087_personal_productivity_contract.sql'")" == 0 ]]; then psqlx -qf drizzle/0087_personal_productivity_contract.sql; fi; }
apply; apply
[[ "$(psqlx -Atqc "select timezone from users where id='a'")" == Asia/Jakarta ]]
[[ "$(psqlx -Atqc "select timezone from users where id='b'")" == Asia/Jakarta ]]
psqlx -q <<'SQL'
INSERT INTO personal_goals(id,user_id,title,life_area,priority,status) VALUES ('00000000-0000-0000-0000-000000000001','a','Goal','Other','medium','not_started');
INSERT INTO personal_habits(id,user_id,name,frequency,weekdays,start_date,status) VALUES ('00000000-0000-0000-0000-000000000002','a','Habit','daily','{}','2026-01-01','active');
INSERT INTO personal_budgets(user_id,month,currency,income) VALUES ('a','2026-09-01','IDR',100),('a','2026-09-01','USD',10);
SQL
if psqlx -qtc "insert into personal_goal_steps(goal_id,user_id,title) values ('00000000-0000-0000-0000-000000000001','b','cross')" >/dev/null 2>&1; then echo cross-user-goal-step-accepted >&2; exit 1; fi
for _ in 1 2; do (psqlx -qtc "insert into personal_habit_checkins(habit_id,user_id,local_date) values ('00000000-0000-0000-0000-000000000002','a','2026-09-01') on conflict do nothing" >/dev/null) & done; wait
[[ "$(psqlx -Atqc "select count(*) from personal_habit_checkins")" == 1 ]]
DATABASE_URL="$url" scripts/run-personal-phase0a-reconciliation.sh >/dev/null
printf 'PERSONAL_PRODUCTIVITY_DB_TEST_OK database=%s\n' "$name"
