#!/usr/bin/env bash
# Silent on healthy state; prints one alert payload on failure/staleness.
set -euo pipefail
BACKUP_DIR=/root/backups/cubicle
LOCAL_MAX_MINUTES=1560
OFFSITE_LOG=/var/log/cubicle-backup-offsite.log
RESTORE_LOG=/var/log/cubicle-restore-test.log
problems=()

latest=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'cubicle_2*.sql.gz' -mmin -"$LOCAL_MAX_MINUTES" -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
if [[ -z "$latest" ]]; then
  problems+=("backup lokal lebih tua dari 26 jam")
elif [[ ! -f "$latest.sha256" ]] || ! sha256sum -c "$latest.sha256" >/dev/null 2>&1; then
  problems+=("checksum backup lokal gagal")
fi

if [[ ! -f "$OFFSITE_LOG" ]] || ! find "$OFFSITE_LOG" -mmin -1560 -print -quit | grep -q .; then
  problems+=("log backup off-host lebih tua dari 26 jam")
elif ! tail -50 "$OFFSITE_LOG" | grep -q 'OK: encrypted off-host backup verified:'; then
  problems+=("backup off-host terakhir tidak terverifikasi")
fi

if [[ ! -f "$RESTORE_LOG" ]] || ! find "$RESTORE_LOG" -mtime -8 -print -quit | grep -q .; then
  problems+=("restore test lebih tua dari 8 hari")
elif ! tail -80 "$RESTORE_LOG" | grep -q 'OK: restore-test passed'; then
  problems+=("restore test terakhir gagal")
fi

if ((${#problems[@]})); then
  printf 'Cubiqlo backup alert: %s\n' "$(IFS='; '; echo "${problems[*]}")"
  exit 1
fi
