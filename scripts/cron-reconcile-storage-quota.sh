#!/usr/bin/env bash
# Scheduled storage-quota reconciliation (Cubiqlo).
#
# Hits the age-gated cron endpoint /api/cron/reconcile-storage-quota with the
# shared CRON_SECRET bearer token. SAFE BY DEFAULT: without --apply this only
# REPORTS (?dryRun=1) — no reservation counter is ever reset. --apply zeroes
# stale reservations only (nonzero counters whose updated_at is >= 5 minutes
# old; in-flight uploads are younger than the gate and are never touched).
#
# Recommended crontab (staggered from the hourly reminders at :00):
#   Dry-run report, hourly:
#     5 * * * * /root/projects/cubicle/scripts/cron-reconcile-storage-quota.sh >> /var/log/cubicle-cron.log 2>&1
#   Explicit apply schedule (pick ONE, off-peak — 19:30 UTC = 02:30 WIB):
#     30 19 * * * /root/projects/cubicle/scripts/cron-reconcile-storage-quota.sh --apply >> /var/log/cubicle-cron.log 2>&1
#
# Required env (default ENV_FILE=$SCRIPT_DIR/../.env.development.local,
# override with ENV_FILE=/path/to/.env):
#   CRON_SECRET
#   CUBICLE_URL    e.g. https://dev.cubiqlo.com
#
# Production apply guard: --apply against https://cubiqlo.com refuses unless
# ALLOW_PRODUCTION_RECONCILE=1 (mirrors scripts/reconcile-storage-quota.ts).
# See docs/operations/storage-quota-reconcile-cron.md.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/../.env.development.local}"

# Only pull needed keys — full env files may contain unquoted values that break `source`.
load_env_key() {
  local key="$1"
  local line val
  line=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -n1 || true)
  [ -n "$line" ] || return 0
  val="${line#*=}"
  # strip surrounding double or single quotes via sed
  val=$(printf '%s' "$val" | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")
  printf -v "$key" '%s' "$val"
  export "$key"
}

if [ -f "$ENV_FILE" ]; then
  load_env_key CRON_SECRET
  load_env_key CUBICLE_URL
fi

: "${CRON_SECRET:?CRON_SECRET not set in env}"
: "${CUBICLE_URL:?CUBICLE_URL not set in env}"

APPLY=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --dry-run) APPLY=0 ;;
    *) echo "unknown argument: $arg (expected --apply or --dry-run)" >&2; exit 2 ;;
  esac
done

BASE_URL="${CUBICLE_URL%/}"
ENDPOINT="/api/cron/reconcile-storage-quota"

QUERY="?dryRun=1" # default: report only, never mutate
if [ "$APPLY" = "1" ]; then
  if [[ "$BASE_URL" == "https://cubiqlo.com" ]] && [ "${ALLOW_PRODUCTION_RECONCILE:-}" != "1" ]; then
    echo "ERROR: Refusing to apply reconciliation against production: set ALLOW_PRODUCTION_RECONCILE=1 to confirm." >&2
    exit 1
  fi
  QUERY="" # explicit apply: the endpoint zeroes stale reservations
fi

URL="$BASE_URL$ENDPOINT$QUERY"
AUTH="Authorization: Bearer $CRON_SECRET"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] GET $URL"
curl -fsS -H "$AUTH" -H "Content-Type: application/json" "$URL"
echo
