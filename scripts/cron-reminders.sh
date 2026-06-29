#!/usr/bin/env bash
# Hit the reminders endpoint with the configured CRON_SECRET.
# Schedule: every hour via cron / UptimeRobot / Better Stack / GH Actions.
#
#   crontab example:
#     0 * * * * /root/projects/cubicle/scripts/cron-reminders.sh >> /var/log/cubicle-cron.log 2>&1
#
# Required env (in /root/projects/cubicle/.env or environment):
#   CRON_SECRET=***
#   CUBICLE_URL=https://cubicle.your-domain.tld

set -euo pipefail

# Load .env if present (project root, two levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

: "${CRON_SECRET:?CRON_SECRET not set in env}"
: "${CUBICLE_URL:?CUBICLE_URL not set in env}"

ENDPOINT="$CUBICLE_URL/api/notifications/reminders"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] POST $ENDPOINT"
curl -fsS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  "$ENDPOINT"
echo
