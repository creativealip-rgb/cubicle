#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
DB_USER=${DB_USER:-postgres}
TEST_DB=${TEST_DB:-cubicle_migration_runner_test}
RUNNER="$ROOT/scripts/migrate-ledger.sh"
FIXTURE_DUMP=${FIXTURE_DUMP:-$(find /root/backups/databases/cubiqlo-manual -maxdepth 1 -name 'cubicle-pre-fk-cleanup-*.dump' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)}

cleanup() {
  docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$TEST_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
[[ -n "$FIXTURE_DUMP" && -f "$FIXTURE_DUMP" ]]
sha256sum -c "$FIXTURE_DUMP.sha256" >/dev/null
docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$TEST_DB"
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$TEST_DB" --no-owner --no-privileges < "$FIXTURE_DUMP"

before_duplicates=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -Atc \
  "SELECT count(*) FROM (SELECT 1 FROM pg_constraint WHERE contype='f' GROUP BY conrelid,conkey,confrelid,confkey,confupdtype,confdeltype,confmatchtype HAVING count(*)>1) duplicate_groups")
[[ "$before_duplicates" == "35" ]]

DB_CONTAINER="$DB_CONTAINER" DB_USER="$DB_USER" DB_NAME="$TEST_DB" "$RUNNER"

after_duplicates=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -Atc \
  "SELECT count(*) FROM (SELECT 1 FROM pg_constraint WHERE contype='f' GROUP BY conrelid,conkey,confrelid,confkey,confupdtype,confdeltype,confmatchtype HAVING count(*)>1) duplicate_groups")
[[ "$after_duplicates" == "0" ]]

ledger_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -Atc \
  "SELECT count(*) FROM cubiqlo_migrations")
[[ "$ledger_count" == "2" ]]

# Second execution must be a controlled no-op.
second_output=$(DB_CONTAINER="$DB_CONTAINER" DB_USER="$DB_USER" DB_NAME="$TEST_DB" "$RUNNER")
grep -q "0040_cleanup_duplicate_foreign_keys.sql ... already applied" <<<"$second_output"
ledger_count_after=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -Atc \
  "SELECT count(*) FROM cubiqlo_migrations")
[[ "$ledger_count_after" == "2" ]]

# A recorded checksum mismatch must fail before executing SQL.
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -c \
  "UPDATE cubiqlo_migrations SET checksum='invalid' WHERE id='0040_cleanup_duplicate_foreign_keys.sql'" >/dev/null
if DB_CONTAINER="$DB_CONTAINER" DB_USER="$DB_USER" DB_NAME="$TEST_DB" "$RUNNER" >/tmp/cubiqlo-migration-drift.out 2>&1; then
  echo "expected checksum drift rejection" >&2
  exit 1
fi
grep -q "checksum drift" /tmp/cubiqlo-migration-drift.out

# Restore valid checksum, then prove DDL + ledger insertion roll back together.
valid_checksum=$(sha256sum "$ROOT/drizzle/0040_cleanup_duplicate_foreign_keys.sql" | awk '{print $1}')
printf "UPDATE cubiqlo_migrations SET checksum='%s' WHERE id='0040_cleanup_duplicate_foreign_keys.sql';\n" "$valid_checksum" \
  | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" >/dev/null
rollback_dir=$(mktemp -d)
cp "$ROOT/drizzle/0040_cleanup_duplicate_foreign_keys.sql" "$rollback_dir/"
cat > "$rollback_dir/0041_forced_rollback.sql" <<'SQL'
CREATE TABLE public.migration_rollback_probe (id integer PRIMARY KEY);
SELECT 1 / 0;
SQL
if MIGRATION_DIR="$rollback_dir" DB_CONTAINER="$DB_CONTAINER" DB_USER="$DB_USER" DB_NAME="$TEST_DB" "$RUNNER" >/tmp/cubiqlo-migration-rollback.out 2>&1; then
  echo "expected forced migration failure" >&2
  exit 1
fi
probe_exists=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -Atc \
  "SELECT to_regclass('public.migration_rollback_probe') IS NOT NULL")
[[ "$probe_exists" == "f" ]]
failed_ledger=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -Atc \
  "SELECT count(*) FROM cubiqlo_migrations WHERE id='0041_forced_rollback.sql'")
[[ "$failed_ledger" == "0" ]]
rm -rf "$rollback_dir"

echo "migration runner integration: PASS"
