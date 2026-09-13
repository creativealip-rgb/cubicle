#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIGRATION_DIR=${MIGRATION_DIR:-"$ROOT/drizzle"}
DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
MIGRATION_DATABASE_URL=${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL is required}
MIGRATION_LOGIN=cubiqlo_migrator
MIGRATION_OWNER=cubiqlo_owner
BASELINE_ID=${BASELINE_ID:-baseline-2026-07-25}
BASELINE_CHECKSUM=${BASELINE_CHECKSUM:-1a4fb3403575a0f69429243bcc16bce1ada4be2ab62eda8b5232223a482350a2}
START_MIGRATION=${START_MIGRATION:-0040}
RETIRED_MIGRATIONS=${RETIRED_MIGRATIONS:-0062_billing_aware_phase9_cleanup.sql}

if [[ "$MIGRATION_DATABASE_URL" == "${DATABASE_URL:-}" ]]; then
  echo "MIGRATION_DATABASE_URL must differ from DATABASE_URL" >&2
  exit 1
fi

PG_ENV_FILE=$(mktemp)
cleanup() { rm -f "$PG_ENV_FILE"; }
trap cleanup EXIT
chmod 600 "$PG_ENV_FILE"
MIGRATION_DATABASE_URL="$MIGRATION_DATABASE_URL" PG_ENV_FILE="$PG_ENV_FILE" node <<'NODE'
const fs = require("node:fs");
const url = new URL(process.env.MIGRATION_DATABASE_URL);
const values = {
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
};
for (const [key, value] of Object.entries(values)) {
  if (!value || /[\r\n]/.test(value)) throw new Error(`Invalid ${key}`);
}
fs.writeFileSync(process.env.PG_ENV_FILE, Object.entries(values).map(([k,v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
NODE
TARGET_DB=$(sed -n 's/^PGDATABASE=//p' "$PG_ENV_FILE")
if [[ "$TARGET_DB" == "cubicle" && "${ALLOW_PRODUCTION_MIGRATION:-}" != "1" ]]; then
  echo "Refusing production migration without ALLOW_PRODUCTION_MIGRATION=1" >&2
  exit 1
fi

psql_base() {
  docker exec --env-file "$PG_ENV_FILE" -i "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 "$@"
}

session_user=$(psql_base -Atc 'select session_user')
[[ "$session_user" == "$MIGRATION_LOGIN" ]] || { echo "Migration connection must use $MIGRATION_LOGIN; got $session_user" >&2; exit 1; }
[[ "$(psql_base -Atc "select pg_has_role(current_user, '$MIGRATION_OWNER', 'MEMBER')")" == t ]] || { echo "$MIGRATION_LOGIN cannot SET ROLE $MIGRATION_OWNER" >&2; exit 1; }
[[ "$(psql_base -Atc "SET ROLE $MIGRATION_OWNER; select current_role" | tail -n 1)" == "$MIGRATION_OWNER" ]] || { echo "SET ROLE $MIGRATION_OWNER failed" >&2; exit 1; }

psql_exec() { { echo "SET ROLE $MIGRATION_OWNER;"; cat; } | psql_base "$@"; }
psql_value() {
  local query=$1
  shift
  { echo "SET ROLE $MIGRATION_OWNER;"; echo "$query"; } | psql_base "$@" -At | tail -n 1
}

psql_exec >/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS public.cubiqlo_migrations (
  id text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  execution_ms integer,
  operator_name text NOT NULL DEFAULT session_user
);
SQL

baseline_checksum=$(psql_value "SELECT checksum FROM public.cubiqlo_migrations WHERE id=:'lookup_id'" -v lookup_id="$BASELINE_ID")
if [[ -z "$baseline_checksum" ]]; then
  psql_exec -v baseline_id="$BASELINE_ID" -v baseline_checksum="$BASELINE_CHECKSUM" >/dev/null <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('cubiqlo-schema-migrations'));
INSERT INTO public.cubiqlo_migrations (id, checksum, execution_ms) VALUES (:'baseline_id', :'baseline_checksum', 0);
COMMIT;
SQL
elif [[ "$baseline_checksum" != "$BASELINE_CHECKSUM" ]]; then
  echo "$BASELINE_ID checksum drift" >&2
  exit 1
fi

found=0
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  found=1
  filename=$(basename "$file")
  if [[ " $RETIRED_MIGRATIONS " == *" $filename "* ]]; then echo "$filename ... retired"; continue; fi
  checksum=$(sha256sum "$file" | cut -d' ' -f1)
  recorded=$(psql_value "SELECT checksum FROM public.cubiqlo_migrations WHERE id=:'lookup_id'" -v lookup_id="$filename")
  if [[ -n "$recorded" ]]; then
    [[ "$recorded" == "$checksum" ]] || { echo "$filename checksum drift" >&2; exit 1; }
    echo "$filename ... already applied"
    continue
  fi
  started=$(date +%s%3N)
  elapsed=$(( $(date +%s%3N) - started ))
  { echo BEGIN\;; echo "SELECT pg_advisory_xact_lock(hashtext('cubiqlo-schema-migrations'));"; cat "$file"; echo "INSERT INTO public.cubiqlo_migrations (id, checksum, execution_ms) VALUES (:'migration_id', :'migration_checksum', :execution_ms);"; echo COMMIT\;; } |
    psql_exec -v migration_id="$filename" -v migration_checksum="$checksum" -v execution_ms="$elapsed" >/dev/null
  echo "$filename ... applied"
done < <(find "$MIGRATION_DIR" -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]_*.sql' -printf '%f\n' | awk -v start="$START_MIGRATION" 'substr($0,1,4) >= start' | sort | sed "s|^|$MIGRATION_DIR/|")

[[ "$found" == 1 ]] || { echo "No migrations found at or after $START_MIGRATION" >&2; exit 1; }
unexpected_owner_count=$(psql_value "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','S','v','m') AND pg_get_userbyid(c.relowner) <> '$MIGRATION_OWNER'")
[[ "$unexpected_owner_count" == 0 ]] || { echo "unexpected_owner_count=$unexpected_owner_count" >&2; exit 1; }
