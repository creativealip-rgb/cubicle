#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
DB_USER=${DB_USER:-postgres}
SOURCE_DB=${SOURCE_DB-}
TEST_DB=${TEST_DB:-cubicle_phase1_it}
APP_CONTAINER=${APP_CONTAINER:-cubicle-dev}
NETWORK=${NETWORK:-dokploy-network}
NODE_IMAGE=${NODE_IMAGE:-node:22-bookworm-slim}
FIXTURE_PREFIX="phase1-$(date +%s)-$$"

if [[ "$SOURCE_DB" != "cubicle_dev" ]]; then
  echo "SOURCE_DB must be explicitly set to cubicle_dev" >&2
  exit 1
fi
if [[ ! "$TEST_DB" =~ ^cubicle_phase1_it(_[A-Za-z0-9_]+)?$ ]]; then
  echo "TEST_DB must use cubicle_phase1_it* disposable namespace" >&2
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
source_columns=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$SOURCE_DB" -X -Atc \
  "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name IN ('time_tracking_mode','activity_required')")
[[ "$source_columns" == "0" ]]

# Clone dev only. Production is never a source or target.
docker exec "$DB_CONTAINER" createdb -U "$DB_USER" -T template0 "$TEST_DB"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SOURCE_DB" -Fc |
  docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$TEST_DB" --no-owner

# Restore --no-owner can omit effective app grants on a fresh database.
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -X -v ON_ERROR_STOP=1 -v test_db="$TEST_DB" <<'SQL' >/dev/null
GRANT CONNECT ON DATABASE :"test_db" TO cubiqlo_app;
GRANT USAGE ON SCHEMA public TO cubiqlo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cubiqlo_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO cubiqlo_app;
SQL

# Seed all deterministic backfill classes before adding Phase 1 columns.
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -X -v ON_ERROR_STOP=1 -v prefix="$FIXTURE_PREFIX" <<'SQL' >/dev/null
WITH inserted_user AS (
  INSERT INTO users (id, name, email, email_verified, plan)
  VALUES (:'prefix' || '-user', 'Phase1 DB User', :'prefix' || '@example.test', true, 'team')
  RETURNING id
), inserted_workspace AS (
  INSERT INTO workspaces (name, slug, owner_id, default_currency)
  SELECT 'Phase1 DB Workspace', :'prefix', id, 'IDR' FROM inserted_user
  RETURNING id
), inserted_member AS (
  INSERT INTO workspace_members (workspace_id, user_id, role)
  SELECT w.id, u.id, 'owner' FROM inserted_workspace w CROSS JOIN inserted_user u
), inserted_client AS (
  INSERT INTO clients (workspace_id, name)
  SELECT id, :'prefix' || '-client' FROM inserted_workspace
  RETURNING id, workspace_id
), inserted_projects AS (
  INSERT INTO projects (workspace_id, client_id, name, billing_type, currency, client_visible)
  SELECT workspace_id, id, :'prefix' || '-fixed', 'project', 'IDR', true FROM inserted_client
  UNION ALL
  SELECT workspace_id, id, :'prefix' || '-hours', 'hours', 'IDR', true FROM inserted_client
  UNION ALL
  SELECT workspace_id, id, :'prefix' || '-package-hours', 'package', 'IDR', true FROM inserted_client
  UNION ALL
  SELECT workspace_id, id, :'prefix' || '-package-zero', 'package', 'IDR', true FROM inserted_client
  RETURNING id
)
SELECT count(*) FROM inserted_projects;

WITH inserted_packages AS (
  INSERT INTO packages (workspace_id, project_id, name, hours, price, currency, active)
  SELECT workspace_id, id, name || '-pkg',
         CASE WHEN name = :'prefix' || '-package-hours' THEN 12 ELSE 0 END,
         1000000, 'IDR', true
  FROM projects
  WHERE name IN (:'prefix' || '-package-hours', :'prefix' || '-package-zero')
  RETURNING id, project_id
)
UPDATE projects p
SET selected_package_id = pkg.id
FROM inserted_packages pkg
WHERE p.id = pkg.project_id;
SQL

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -X -v ON_ERROR_STOP=1 \
  < "$ROOT/drizzle/0047_project_time_tracking_mode.sql" >/dev/null

app_database_url=$(docker inspect "$APP_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' |
  python3 -c 'import sys; from urllib.parse import urlsplit,urlunsplit; db=sys.argv[1]; raw=next(x.split("=",1)[1].strip() for x in sys.stdin if x.startswith("DATABASE_URL=")); u=urlsplit(raw); print(urlunsplit((u.scheme,u.netloc,"/"+db,u.query,u.fragment)))' "$TEST_DB")

docker run --rm --network "$NETWORK" \
  -v "$ROOT:/app" -w /app \
  -e DATABASE_URL="$app_database_url" \
  -e EXPECTED_DATABASE="$TEST_DB" \
  -e FIXTURE_PREFIX="$FIXTURE_PREFIX" \
  "$NODE_IMAGE" \
  ./node_modules/.bin/tsx scripts/test-phase1-db-integration.mts

# Production schema and fixture isolation must remain untouched.
production_columns=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d cubicle -X -Atc \
  "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name IN ('time_tracking_mode','activity_required')")
production_fixtures=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d cubicle -X -Atc \
  "SELECT count(*) FROM projects WHERE name LIKE '$FIXTURE_PREFIX-%'")
[[ "$production_columns" == "0" ]]
[[ "$production_fixtures" == "0" ]]
printf 'PASS\tproduction DB untouched\n'

cleanup
trap - EXIT
remaining=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -X -Atc \
  "SELECT count(*) FROM pg_database WHERE datname='$TEST_DB'")
[[ "$remaining" == "0" ]]
printf 'PASS\tdisposable DB removed\n'
