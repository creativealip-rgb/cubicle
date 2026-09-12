#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIGRATION_DIR=${MIGRATION_DIR:-"$ROOT/drizzle"}
DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
MIGRATION_DATABASE_URL=${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL is required}
MIGRATION_LOGIN=${MIGRATION_LOGIN:-cubiqlo_migrator}
MIGRATION_OWNER=${MIGRATION_OWNER:-cubiqlo_owner}
BASELINE_ID=${BASELINE_ID:-baseline-2026-07-25}
BASELINE_CHECKSUM=${BASELINE_CHECKSUM:-1a4fb3403575a0f69429243bcc16bce1ada4be2ab62eda8b5232223a482350a2}
START_MIGRATION=${START_MIGRATION:-0040}
RETIRED_MIGRATIONS=${RETIRED_MIGRATIONS:-0062_billing_aware_phase9_cleanup.sql}

if [[ "$MIGRATION_DATABASE_URL" == "${DATABASE_URL:-}" ]]; then
  echo "MIGRATION_DATABASE_URL must differ from DATABASE_URL" >&2
  exit 1
fi

psql_base() {
  docker exec -e MIGRATION_DATABASE_URL="$MIGRATION_DATABASE_URL" -i "$DB_CONTAINER" \
    psql -X -v ON_ERROR_STOP=1 "$MIGRATION_DATABASE_URL" "$@"
}

session_user=$(psql_base -Atc 'select session_user')
if [[ "$session_user" != "$MIGRATION_LOGIN" ]]; then
  echo "Migration connection must use $MIGRATION_LOGIN; got $session_user" >&2
  exit 1
fi

can_set_role=$(psql_base -Atc "select pg_has_role(current_user, '$MIGRATION_OWNER', 'MEMBER')")
if [[ "$can_set_role" != "t" ]]; then
  echo "$MIGRATION_LOGIN cannot SET ROLE $MIGRATION_OWNER" >&2
  exit 1
fi

psql_exec() {
  { printf 'SET ROLE %s;\n' "$MIGRATION_OWNER"; cat; } | psql_base "$@"
}

psql_value() {
  psql_base -Atc "SET ROLE $MIGRATION_OWNER; select current_role; $1" | tail -n 1
}

current_role=$(psql_base -Atc "SET ROLE $MIGRATION_OWNER; select current_role" | tail -n 1)
if [[ "$current_role" != "$MIGRATION_OWNER" ]]; then
  echo "SET ROLE $MIGRATION_OWNER failed" >&2
  exit 1
fi

psql_exec >/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS public.cubiqlo_migrations (
  id text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  execution_ms integer,
  operator_name text NOT NULL DEFAULT session_user
);
SQL

baseline_checksum=$(psql_value "SELECT checksum FROM public.cubiqlo_migrations WHERE id='$BASELINE_ID'")
if [[ -z "$baseline_checksum" ]]; then
  psql_exec -v baseline_id="$BASELINE_ID" -v baseline_checksum="$BASELINE_CHECKSUM" >/dev/null <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('cubiqlo-schema-migrations'));
INSERT INTO public.cubiqlo_migrations (id, checksum, execution_ms)
VALUES (:'baseline_id', :'baseline_checksum', 0);
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
  if [[ " $RETIRED_MIGRATIONS " == *" $filename "* ]]; then
    echo "$filename ... retired"
    continue
  fi
  checksum=$(sha256sum "$file" | cut -d' ' -f1)
  recorded=$(psql_value "SELECT checksum FROM public.cubiqlo_migrations WHERE id='$filename'")
  if [[ -n "$recorded" ]]; then
    [[ "$recorded" == "$checksum" ]] || { echo "$filename checksum drift" >&2; exit 1; }
    echo "$filename ... already applied"
    continue
  fi
  started=$(date +%s%3N)
  {
    echo "BEGIN;"
    echo "SELECT pg_advisory_xact_lock(hashtext('cubiqlo-schema-migrations'));"
    cat "$file"
    elapsed=$(( $(date +%s%3N) - started ))
    printf "INSERT INTO public.cubiqlo_migrations (id, checksum, execution_ms) VALUES ('%s', '%s', %d);\n" "$filename" "$checksum" "$elapsed"
    echo "COMMIT;"
  } | psql_exec >/dev/null
  echo "$filename ... applied"
done < <(find "$MIGRATION_DIR" -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]_*.sql' -printf '%f\n' | awk -v start="$START_MIGRATION" 'substr($0,1,4) >= start' | sort | sed "s|^|$MIGRATION_DIR/|")

[[ "$found" == 1 ]] || { echo "No migrations found at or after $START_MIGRATION" >&2; exit 1; }

unexpected_owner_count=$(psql_value "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','S','v','m') AND pg_get_userbyid(c.relowner) <> '$MIGRATION_OWNER'")
[[ "$unexpected_owner_count" == 0 ]] || { echo "unexpected_owner_count=$unexpected_owner_count" >&2; exit 1; }
