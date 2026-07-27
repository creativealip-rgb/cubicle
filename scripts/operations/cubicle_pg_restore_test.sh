#!/usr/bin/env bash
# Cubicle backup restore-test — verifies the latest daily backup actually loads.
# Spins up a throwaway postgres, restores the most recent dump, sanity-checks schema + row counts,
# then cleans up. Run weekly via cron, manually any time.
set -euo pipefail

BACKUP_DIR="/root/backups/cubicle"
TEST_CONTAINER="cubicle-pg-restore-test"
TEST_DB="cubicle_restore_test"
TEST_USER="postgres"
TEST_PASS="restore_test_pw"

cleanup() {
  docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

LATEST=$(ls -1t "$BACKUP_DIR"/cubicle_2*.sql.gz 2>/dev/null | head -1 || true)
if [[ -z "$LATEST" ]]; then
  echo "FAIL: no cubicle_2*.sql.gz backup found in $BACKUP_DIR" >&2
  exit 1
fi
echo "Testing restore of: $LATEST"

if ! sha256sum -c "$LATEST.sha256"; then
  echo "FAIL: checksum verification failed for $LATEST" >&2
  exit 1
fi

# Start throwaway
docker run -d --rm \
  --name "$TEST_CONTAINER" \
  -e POSTGRES_USER="$TEST_USER" \
  -e POSTGRES_PASSWORD="$TEST_PASS" \
  -e POSTGRES_DB="$TEST_DB" \
  postgres:16 >/dev/null

# Wait for final ready state (max 60s). The image briefly exposes a temporary
# init server, so require two SQL probes separated by two seconds.
READY=0
for i in {1..60}; do
  if docker exec "$TEST_CONTAINER" psql -U "$TEST_USER" -d postgres -Atqc 'SELECT 1' >/dev/null 2>&1; then
    sleep 2
    if docker exec "$TEST_CONTAINER" psql -U "$TEST_USER" -d postgres -Atqc 'SELECT 1' >/dev/null 2>&1; then
      READY=1
      break
    fi
  fi
  sleep 1
done

if [[ "$READY" -ne 1 ]]; then
  docker logs "$TEST_CONTAINER" >&2 || true
  echo "FAIL: test postgres did not become ready" >&2
  exit 1
fi

# Drop + recreate db, then load
docker exec "$TEST_CONTAINER" psql -U "$TEST_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS $TEST_DB;" >/dev/null
docker exec "$TEST_CONTAINER" psql -U "$TEST_USER" -d postgres \
  -c "CREATE DATABASE $TEST_DB;" >/dev/null

zcat "$LATEST" | docker exec -i "$TEST_CONTAINER" psql -U "$TEST_USER" -d "$TEST_DB" -v ON_ERROR_STOP=1 >/dev/null

# Sanity checks
TABLES=$(docker exec "$TEST_CONTAINER" psql -U "$TEST_USER" -d "$TEST_DB" -At \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
if [[ "$TABLES" -lt 10 ]]; then
  echo "FAIL: only $TABLES public tables restored (expected 10+)" >&2
  exit 1
fi

# Quick row counts on key tables
for tbl in users workspaces clients projects tasks invoices time_entries files; do
  cnt=$(docker exec "$TEST_CONTAINER" psql -U "$TEST_USER" -d "$TEST_DB" -At \
    -c "SELECT count(*) FROM $tbl;" 2>/dev/null || echo "ERR")
  printf '  %-18s %s\n' "$tbl" "$cnt"
done

echo "OK: restore-test passed ($TABLES tables)"
