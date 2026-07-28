#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
DB_USER=${DB_USER:-postgres}
SOURCE_DB=${SOURCE_DB-}
TEST_DB=${TEST_DB:-cubicle_phase0a_it}
APP_CONTAINER=${APP_CONTAINER:-cubicle-dev}
NETWORK=${NETWORK:-dokploy-network}
NODE_IMAGE=${NODE_IMAGE:-node:22-bookworm-slim}

if [[ "$SOURCE_DB" != "cubicle_dev" ]]; then
  echo "SOURCE_DB must be explicitly set to cubicle_dev" >&2
  exit 1
fi
if [[ ! "$TEST_DB" =~ ^cubicle_phase0a_it(_[A-Za-z0-9_]+)?$ ]]; then
  echo "TEST_DB must use cubicle_phase0a_it* disposable namespace" >&2
  exit 1
fi
if [[ "$TEST_DB" == "$SOURCE_DB" || "$TEST_DB" == "cubicle" ]]; then
  echo "Refusing unsafe TEST_DB=$TEST_DB" >&2
  exit 1
fi

cleanup() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -X -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$TEST_DB' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true
  docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$TEST_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

source_database=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$SOURCE_DB" -X -Atc 'SELECT current_database()')
[[ "$source_database" == "$SOURCE_DB" ]]

docker exec "$DB_CONTAINER" createdb -U "$DB_USER" -T template0 "$TEST_DB"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SOURCE_DB" -Fc |
  docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$TEST_DB" --no-owner

app_database_url=$(docker inspect "$APP_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' |
  python3 -c 'import sys; from urllib.parse import urlsplit,urlunsplit; db=sys.argv[1]; raw=next(x.split("=",1)[1].strip() for x in sys.stdin if x.startswith("DATABASE_URL=")); u=urlsplit(raw); print(urlunsplit((u.scheme,u.netloc,"/"+db,u.query,u.fragment)))' "$TEST_DB")

docker run --rm --network "$NETWORK" \
  -v "$ROOT:/app" -w /app \
  -e DATABASE_URL="$app_database_url" \
  -e EXPECTED_DATABASE="$TEST_DB" \
  "$NODE_IMAGE" \
  ./node_modules/.bin/tsx scripts/test-phase0a-db-integration.mts

remaining=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -X -Atc \
  "SELECT count(*) FROM pg_database WHERE datname='$TEST_DB'")
[[ "$remaining" == "1" ]]
printf 'PASS\tdisposable DB cleanup scheduled\n'
