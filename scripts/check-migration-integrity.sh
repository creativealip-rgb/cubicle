#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIGRATION_DIR="${MIGRATION_DIR:-$ROOT/drizzle}"
REGISTRY="$ROOT/docs/migration-registry.md"
START_MIGRATION="${START_MIGRATION:-0097}"
[[ -d "$MIGRATION_DIR" ]] || { echo "missing migration dir: $MIGRATION_DIR" >&2; exit 1; }
[[ -f "$REGISTRY" ]] || { echo "missing registry: $REGISTRY" >&2; exit 1; }

mapfile -t files < <(find "$MIGRATION_DIR" -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]_*.sql' -printf '%f\n' | sort)
declare -A seen
for file in "${files[@]}"; do
  number=${file:0:4}
  if [[ "$number" < "$START_MIGRATION" ]]; then
    continue
  fi
  [[ -z "${seen[$number]:-}" ]] || { echo "duplicate migration number at/after $START_MIGRATION: $number" >&2; exit 1; }
  seen[$number]=1
  grep -q "\`$number\`" "$REGISTRY" || { echo "unregistered migration: $file" >&2; exit 1; }
done
printf 'Migration integrity OK: %s strict SQL files registered (legacy files before %s excluded)\n' "${#seen[@]}" "$START_MIGRATION"
