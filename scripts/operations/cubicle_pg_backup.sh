#!/usr/bin/env bash
# Cubicle DB backup — daily dump + global roles + sha256 + retention + optional Telegram alert
# Usage: cubicle_pg_backup.sh [--alert-on-fail]
set -euo pipefail

CONTAINER="cubicle-pg"
DB_USER="postgres"
DB_NAME="cubicle"
BACKUP_DIR="/root/backups/cubicle"
DAILY_KEEP=7
WEEKLY_KEEP=4
RETENTION_DAYS=30
TS=$(date -u +%Y%m%dT%H%M%SZ)
DAY_OF_WEEK=$(date -u +%u)  # 1=Mon..7=Sun

ALERT_ON_FAIL=0
for arg in "$@"; do
  case "$arg" in
    --alert-on-fail) ALERT_ON_FAIL=1 ;;
  esac
done

send_alert() {
  local msg="$1"
  if [[ $ALERT_ON_FAIL -eq 1 ]] && command -v curl >/dev/null 2>&1; then
    # Telegram: only fires when run from cron with --alert-on-fail AND TELEGRAM_BOT_TOKEN/CHAT_ID set
    if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
      curl -fsS --max-time 10 \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="🚨 cubicle backup FAILED: $msg" \
        >/dev/null 2>&1 || true
    fi
    logger -t cubicle-backup "$msg" || true
  fi
}

mkdir -p "$BACKUP_DIR"

# Pre-flight
if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "FAIL: container $CONTAINER not found" >&2
  send_alert "container $CONTAINER not found"
  exit 1
fi

# Dump main DB
DB_OUT="$BACKUP_DIR/cubicle_${TS}.sql.gz"
if ! docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
     | gzip -9 > "$DB_OUT"; then
  echo "FAIL: pg_dump returned non-zero" >&2
  send_alert "pg_dump failed"
  rm -f "$DB_OUT"
  exit 1
fi

sha256sum "$DB_OUT" > "$DB_OUT.sha256"

# Global roles (cheap, useful for full restore)
GLOBAL_OUT="$BACKUP_DIR/cubicle_global_${TS}.sql.gz"
docker exec "$CONTAINER" pg_dumpall -U "$DB_USER" --globals-only \
  | gzip -9 > "$GLOBAL_OUT" || true
sha256sum "$GLOBAL_OUT" > "$GLOBAL_OUT.sha256" 2>/dev/null || true

# On Sunday, also keep a weekly copy (already in BACKUP_DIR, just tag)
if [[ "$DAY_OF_WEEK" -eq 7 ]]; then
  cp "$DB_OUT" "$BACKUP_DIR/cubicle_weekly_${TS}.sql.gz"
  cp "$DB_OUT.sha256" "$BACKUP_DIR/cubicle_weekly_${TS}.sql.gz.sha256"
fi

# Retention
# Daily: keep last DAILY_KEEP
ls -1t "$BACKUP_DIR"/cubicle_2*.sql.gz 2>/dev/null \
  | tail -n +$((DAILY_KEEP + 1)) \
  | while read -r f; do
      rm -f "$f" "${f}.sha256"
    done
# Weekly: keep last WEEKLY_KEEP
ls -1t "$BACKUP_DIR"/cubicle_weekly_*.sql.gz 2>/dev/null \
  | tail -n +$((WEEKLY_KEEP + 1)) \
  | while read -r f; do
      rm -f "$f" "${f}.sha256"
    done
# Anything older than RETENTION_DAYS — safety net
find "$BACKUP_DIR" -type f \( -name 'cubicle_*.sql.gz' -o -name 'cubicle_*.sql.gz.sha256' \) \
  -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

SIZE=$(du -h "$DB_OUT" | cut -f1)
echo "OK: cubicle backup $DB_OUT ($SIZE)"
