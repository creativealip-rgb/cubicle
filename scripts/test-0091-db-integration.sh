#!/usr/bin/env bash
set -euo pipefail

container="${POSTGRES_CONTAINER:-cubicle-pg}"
db="${POSTGRES_DB:-postgres}"
test_db="cubicle_0091_it"
psql=(docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}")

cleanup() { "${psql[@]}" -d "$db" -c "DROP DATABASE IF EXISTS $test_db WITH (FORCE);" >/dev/null; }
trap cleanup EXIT

"${psql[@]}" -d "$db" -c "DROP DATABASE IF EXISTS $test_db WITH (FORCE);" >/dev/null
"${psql[@]}" -d "$db" -c "CREATE DATABASE $test_db;" >/dev/null
"${psql[@]}" -d "$test_db" <<'SQL'
CREATE TABLE users (id text PRIMARY KEY);
CREATE TABLE cubiqlo_migrations (id text PRIMARY KEY, checksum text, operator_name text, applied_at timestamptz DEFAULT now());
SQL
for run in 1 2; do
  docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "$test_db" < drizzle/0091_password_email_otp_recovery.sql >/dev/null
  echo "migration run $run: PASS"
done

"${psql[@]}" -d "$test_db" -tAc "
SELECT CASE WHEN count(*) = 4 THEN 'tables: PASS' ELSE 'tables: FAIL' END FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('auth_login_otp_challenges','auth_trusted_devices','auth_recovery_handoffs','auth_recovery_authorizations');
SELECT CASE WHEN count(*) >= 4 THEN 'unique/index/check constraints: PASS' ELSE 'unique/index/check constraints: FAIL' END FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid WHERE r.relname IN ('auth_login_otp_challenges','auth_trusted_devices','auth_recovery_handoffs','auth_recovery_authorizations') AND (c.contype IN ('u','c') OR c.contype = 'p');
SELECT CASE WHEN is_nullable = 'NO' THEN 'flow_id nonnull: PASS' ELSE 'flow_id nonnull: FAIL' END FROM information_schema.columns WHERE table_name='auth_login_otp_challenges' AND column_name='flow_id';
"
echo '0091 DB integration: PASS'
