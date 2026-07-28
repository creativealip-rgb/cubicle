#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
DB_USER=${DB_USER:-postgres}
SOURCE_DB=${SOURCE_DB-}
TEST_DB=${TEST_DB:-cubicle_phase3_it}
APP_CONTAINER=${APP_CONTAINER:-cubicle-dev}
NETWORK=${NETWORK:-dokploy-network}
NODE_IMAGE=${NODE_IMAGE:-node:22-bookworm-slim}
FIXTURE_PREFIX="phase3-$(date +%s)-$$"
APP_DB_USER=$(docker inspect "$APP_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' |
  python3 -c 'import sys; from urllib.parse import urlsplit; raw=next(x.split("=",1)[1].strip() for x in sys.stdin if x.startswith("DATABASE_URL=")); print(urlsplit(raw).username)')

if [[ "$SOURCE_DB" != "cubicle_dev" ]]; then
  echo "SOURCE_DB must be explicitly set to cubicle_dev" >&2
  exit 1
fi
if [[ ! "$TEST_DB" =~ ^cubicle_phase3_it(_[A-Za-z0-9_]+)?$ ]]; then
  echo "TEST_DB must use cubicle_phase3_it* disposable namespace" >&2
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
source_phase3_tables=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$SOURCE_DB" -X -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('service_categories','services','project_services')")
if [[ "$source_phase3_tables" != "0" && "$source_phase3_tables" != "3" ]]; then
  echo "Unexpected Phase 3 table count in $SOURCE_DB: $source_phase3_tables" >&2
  exit 1
fi
if [[ "$source_phase3_tables" == "3" ]]; then
  source_phase3_columns=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$SOURCE_DB" -X -Atc \
    "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('tasks','time_entries') AND column_name='project_service_id'")
  source_phase3_ledger=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$SOURCE_DB" -X -Atc \
    "SELECT count(*) FROM cubiqlo_migrations WHERE id='0049_service_catalog.sql'")
  [[ "$source_phase3_columns" == "2" ]]
  [[ "$source_phase3_ledger" == "1" ]]
fi

docker exec "$DB_CONTAINER" createdb -U "$DB_USER" -T template0 "$TEST_DB"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SOURCE_DB" -Fc |
  docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$TEST_DB" --no-owner

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -X -v ON_ERROR_STOP=1 \
  -v test_db="$TEST_DB" -v app_db_user="$APP_DB_USER" <<'SQL' >/dev/null
GRANT CONNECT ON DATABASE :"test_db" TO :"app_db_user";
GRANT USAGE ON SCHEMA public TO :"app_db_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_db_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"app_db_user";
SQL

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -X -v ON_ERROR_STOP=1 -v prefix="$FIXTURE_PREFIX" <<'SQL' >/dev/null
CREATE TABLE phase3_fixture_ids (prefix text NOT NULL, key text NOT NULL, value text NOT NULL);
WITH inserted_users AS (
  INSERT INTO users (id,name,email,email_verified,plan)
  VALUES
    (:'prefix'||'-user','Phase3 User',:'prefix'||'@example.test',true,'team'),
    (:'prefix'||'-other-user','Phase3 Other User',:'prefix'||'-other@example.test',true,'team')
  RETURNING id
), inserted_workspaces AS (
  INSERT INTO workspaces (name,slug,owner_id,default_currency)
  VALUES
    ('Phase3 Workspace',:'prefix',:'prefix'||'-user','IDR'),
    ('Phase3 Other Workspace',:'prefix'||'-other',:'prefix'||'-other-user','IDR')
  RETURNING id,slug
), inserted_members AS (
  INSERT INTO workspace_members (workspace_id,user_id,role)
  SELECT id, CASE WHEN slug=:'prefix' THEN :'prefix'||'-user' ELSE :'prefix'||'-other-user' END, 'owner'
  FROM inserted_workspaces
), inserted_clients AS (
  INSERT INTO clients (workspace_id,name)
  SELECT id, CASE WHEN slug=:'prefix' THEN :'prefix'||'-client' ELSE :'prefix'||'-other-client' END
  FROM inserted_workspaces
  RETURNING id,workspace_id
), inserted_projects AS (
  INSERT INTO projects (workspace_id,client_id,name,billing_type,time_tracking_mode,activity_required,currency,client_visible)
  SELECT c.workspace_id,c.id,:'prefix'||'-project','project','billable',true,'IDR',false
  FROM inserted_clients c JOIN inserted_workspaces w ON w.id=c.workspace_id WHERE w.slug=:'prefix'
  RETURNING id,workspace_id,client_id,name
)
INSERT INTO phase3_fixture_ids(prefix,key,value)
SELECT :'prefix','workspace_id',id::text FROM inserted_workspaces WHERE slug=:'prefix'
UNION ALL SELECT :'prefix','other_workspace_id',id::text FROM inserted_workspaces WHERE slug=:'prefix'||'-other'
UNION ALL SELECT :'prefix','project_id',id::text FROM inserted_projects WHERE name=:'prefix'||'-project'
UNION ALL SELECT :'prefix','client_id',client_id::text FROM inserted_projects WHERE name=:'prefix'||'-project'
UNION ALL SELECT :'prefix','user_id',:'prefix'||'-user';
SQL

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -X -v ON_ERROR_STOP=1 \
  < "$ROOT/drizzle/0049_service_catalog.sql" >/dev/null

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -X -v ON_ERROR_STOP=1 \
  -v app_db_user="$APP_DB_USER" <<'SQL' >/dev/null
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_db_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"app_db_user";
SET ROLE :"app_db_user";
SELECT count(*) FROM phase3_fixture_ids;
RESET ROLE;
SQL

app_database_url=$(docker inspect "$APP_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' |
  python3 -c 'import sys; from urllib.parse import urlsplit,urlunsplit; db=sys.argv[1]; raw=next(x.split("=",1)[1].strip() for x in sys.stdin if x.startswith("DATABASE_URL=")); u=urlsplit(raw); print(urlunsplit((u.scheme,u.netloc,"/"+db,u.query,u.fragment)))' "$TEST_DB")

docker run --rm --network "$NETWORK" \
  -v "$ROOT:/app" -w /app \
  -e DATABASE_URL="$app_database_url" \
  -e EXPECTED_DATABASE="$TEST_DB" \
  -e FIXTURE_PREFIX="$FIXTURE_PREFIX" \
  "$NODE_IMAGE" \
  ./node_modules/.bin/tsx scripts/test-phase3-db-integration.mts

production_phase3_tables=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d cubicle -X -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('service_categories','services','project_services')")
production_phase3_columns=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d cubicle -X -Atc \
  "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('tasks','time_entries') AND column_name='project_service_id'")
production_fixtures=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d cubicle -X -Atc \
  "SELECT count(*) FROM projects WHERE name LIKE '$FIXTURE_PREFIX-%'")
[[ "$production_phase3_tables" == "0" ]]
[[ "$production_phase3_columns" == "0" ]]
[[ "$production_fixtures" == "0" ]]
printf 'PASS\tproduction DB untouched\n'

cleanup
trap - EXIT
remaining=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -X -Atc \
  "SELECT count(*) FROM pg_database WHERE datname='$TEST_DB'")
[[ "$remaining" == "0" ]]
printf 'PASS\tdisposable DB removed\n'
