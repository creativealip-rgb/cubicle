#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
db_name="$(psql "$DATABASE_URL" -Atqc 'select current_database()')"
[[ "$db_name" == cubicle_phase0a_it* ]] || { echo "refusing non-disposable database: $db_name" >&2; exit 2; }
out="$(mktemp)"; trap 'rm -f "$out"' EXIT
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -AtF '|' -f docs/plans/personal-productivity-phase0a-reconciliation.sql >"$out"
awk -F'|' '
$1 ~ /^(users_timezone_null_or_blank|goal_missing_user|step_orphan_or_owner_mismatch|habit_missing_user|habit_goal_or_owner_mismatch|checkin_orphan_or_owner_mismatch|category_missing_user|transaction_missing_user|transaction_category_or_owner_mismatch|budget_missing_user|goal_invalid_|habit_invalid_|category_invalid_|transaction_invalid_|budget_invalid_|duplicate_|invalid_receipt_prefix)$/ && ($2+0)!=0 { bad=1; print > "/dev/stderr" }
$1 ~ /^(missing_constraint|missing_index|unexpected_constraint|unexpected_index)$/ { bad=1; print > "/dev/stderr" }
END { exit bad }
' "$out"
printf '{"status":"ok","database":"%s"}\n' "$db_name"
