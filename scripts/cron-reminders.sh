#!/usr/bin/env bash
# Hit Cubiqlo reminder endpoints with CRON_SECRET.
# Schedule hourly:
#   0 * * * * /root/projects/cubicle/scripts/cron-reminders.sh >> /var/log/cubicle-cron.log 2>&1
#
# Required env in /root/projects/cubicle/.env:
#   CRON_SECRET
#   CUBICLE_URL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# Only pull needed keys — full .env may contain unquoted values that break `source`.
load_env_key() {
  local key="$1"
  local line val
  line=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -n1 || true)
  [ -n "$line" ] || return 0
  val="${line#*=}"
  # strip surrounding double or single quotes via sed
  val=$(printf '%s' "$val" | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\\(.*\\)'$/\\1/")
  printf -v "$key" '%s' "$val"
  export "$key"
}

if [ -f "$ENV_FILE" ]; then
  load_env_key CRON_SECRET
  load_env_key CUBICLE_URL
fi

: "${CRON_SECRET:?CRON_SECRET not set in env}"
: "${CUBICLE_URL:?CUBICLE_URL not set in env}"

auth_hdr() {
  printf '%s %s' 'Authorization: Bearer' "$CRON_SECRET"
}

hit_get() {
  local path="$1"
  local url="$CUBICLE_URL$path"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] GET $url"
  curl -fsS -H "$(auth_hdr)" -H "Content-Type: application/json" "$url"
  echo
}

hit_post() {
  local path="$1"
  local url="$CUBICLE_URL$path"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] POST $url"
  curl -fsS -X POST -H "$(auth_hdr)" -H "Content-Type: application/json" "$url"
  echo
}

# Generic reminders (invoice/task)
if curl -fsS -o /dev/null -w '' -X POST -H "$(auth_hdr)" "$CUBICLE_URL/api/cron/reminders" 2>/dev/null; then
  hit_post "/api/cron/reminders"
elif curl -fsS -o /dev/null -w '' -X POST -H "$(auth_hdr)" "$CUBICLE_URL/api/notifications/reminders" 2>/dev/null; then
  hit_post "/api/notifications/reminders"
else
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN: generic reminders endpoint not reachable"
fi

# Personal note due reminders (7d/3d/1d, 20h dedupe)
hit_get "/api/cron/personal-note-reminders"
