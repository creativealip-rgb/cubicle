#!/usr/bin/env bash
# Missed-webhook Pakasir payment sync (Cubiqlo billing recovery).
#
# Safety net for Pakasir webhooks that never arrived (provider outage, network
# drop, deploy window). Hits /api/cron/pakasir-sync with the shared CRON_SECRET
# bearer token; the endpoint re-fetches provider transaction detail (fail-closed)
# and completes only payments the provider confirms as completed, via the SAME
# idempotent activation helper the live webhook uses, so replay is safe.
#
# Recommended crontab (staggered from the :00 reminders and :05 reconcile jobs):
#   10 * * * * /root/projects/cubicle/scripts/cron-pakasir-sync.sh >> /var/log/cubicle-cron.log 2>&1
#
# Required env (default ENV_FILE=$SCRIPT_DIR/../.env.development.local,
# override with ENV_FILE=/path/to/.env):
#   CRON_SECRET
#   CUBIQLO_URL or CUBICLE_URL   (defaults to https://dev.cubiqlo.com when unset)
#
# Production guard: this endpoint activates payments, so running against
# https://cubiqlo.com refuses unless ALLOW_PRODUCTION_BILLING_CRON=1.
# See docs/operations/billing-cron.md.

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
  load_env_key CUBIQLO_URL
  load_env_key CUBICLE_URL
fi

: "${CRON_SECRET:?CRON_SECRET not set in env}"
BASE_URL="${CUBIQLO_URL:-${CUBICLE_URL:-https://dev.cubiqlo.com}}"

if [[ "$BASE_URL" == "https://cubiqlo.com" || "$BASE_URL" == "https://www.cubiqlo.com" ]]; then
  if [ "${ALLOW_PRODUCTION_BILLING_CRON:-}" != "1" ]; then
    echo "ERROR: Refusing to run billing cron against production: set ALLOW_PRODUCTION_BILLING_CRON=1 to confirm." >&2
    exit 1
  fi
fi

URL="${BASE_URL%/}/api/cron/pakasir-sync"
AUTH="Authorization: Bearer $CRON_SECRET"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] GET $URL"
curl -fsS -H "$AUTH" -H "Content-Type: application/json" "$URL"
echo
