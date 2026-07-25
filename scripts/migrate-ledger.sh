#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIGRATION_DIR=${MIGRATION_DIR:-"$ROOT/drizzle"}
DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-cubicle}
BASELINE_ID=${BASELINE_ID:-baseline-2026-07-25}
BASELINE_CHECKSUM=${BASELINE_CHECKSUM:-1a4fb3403575a0f69429243bcc16bce1ada4be2ab62eda8b5232223a482350a2}
START_MIGRATION=${START_MIGRATION:-0040}

psql_exec() {
  docker exec -i "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" "$@"
}

psql_value() {
  docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -Atc "$1"
}

psql_exec >/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS public.cubiqlo_migrations (
  id text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  execution_ms integer,
  operator_name text NOT NULL DEFAULT current_user
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
  echo "$BASELINE_ID ... recorded"
elif [[ "$baseline_checksum" != "$BASELINE_CHECKSUM" ]]; then
  echo "$BASELINE_ID ... checksum drift" >&2
  exit 1
else
  echo "$BASELINE_ID ... already applied"
fi

found=0
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  found=1
  filename=$(basename "$file")
  checksum=$(sha256sum "$file" | awk '{print $1}')
  recorded=$(psql_value "SELECT checksum FROM public.cubiqlo_migrations WHERE id='$filename'")

  if [[ -n "$recorded" ]]; then
    if [[ "$recorded" != "$checksum" ]]; then
      echo "$filename ... checksum drift" >&2
      exit 1
    fi
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

if [[ "$found" == 0 ]]; then
  echo "No migrations found at or after $START_MIGRATION" >&2
  exit 1
fi
