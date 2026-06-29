# Cubicle / Cubiqlo — Ops, Backup, Monitoring

Last updated: 2026-06-29

Use this doc for production operations after deploy.

## 1. Production services

Docker services:

```bash
docker ps --filter name=cubicle --format '{{.Names}} {{.Status}}'
```

Expected:

```text
cubicle-cubicle-1 Up ... (healthy)
cubicle-pg Up ... (healthy)
```

Public health:

```bash
curl -sS https://cubiqlo.com/api/health
```

Expected:

```json
{"ok":true}
```

## 2. Cron jobs

Current host crontab contains:

```cron
0 * * * * /root/projects/cubicle/scripts/cron-reminders.sh >> /var/log/cubicle-cron.log 2>&1
15 19 * * * /root/scripts/cubicle_pg_backup.sh --alert-on-fail >> /var/log/cubicle-backup.log 2>&1
0 20 * * 0 /root/scripts/cubicle_pg_restore_test.sh >> /var/log/cubicle-restore-test.log 2>&1
*/5 * * * * /root/projects/cubicle/scripts/monitor.sh >> /root/projects/cubicle/scripts/monitor.log 2>&1
```

Notes:
- Backup cron runs daily at `19:15 UTC` = `02:15 WIB`.
- Restore test runs Sunday at `20:00 UTC` = Monday `03:00 WIB`.
- Monitor runs every 5 minutes.
- Reminder cron runs hourly.

## 3. Backup

Script:

```bash
/root/scripts/cubicle_pg_backup.sh --alert-on-fail
```

Backup target:

```text
/root/backups/cubicle
```

Backup outputs:
- `cubicle_YYYYMMDDTHHMMSSZ.sql.gz`
- matching `.sha256`
- `cubicle_global_YYYYMMDDTHHMMSSZ.sql.gz`
- weekly `cubicle_weekly_*.sql.gz` on Sunday

Retention:
- daily keep: 7
- weekly keep: 4
- safety delete older than 30 days

Manual backup command:

```bash
/root/scripts/cubicle_pg_backup.sh --alert-on-fail
```

Verify latest backup exists:

```bash
ls -lh /root/backups/cubicle | tail
sha256sum -c /root/backups/cubicle/*.sha256
```

## 4. Restore test

Script:

```bash
/root/scripts/cubicle_pg_restore_test.sh
```

Behavior:
- picks latest `/root/backups/cubicle/cubicle_2*.sql.gz`
- starts throwaway `postgres:16` container
- restores dump into `cubicle_restore_test`
- checks public table count >= 10
- prints row counts for key tables
- removes test container on exit

Manual restore-test command:

```bash
/root/scripts/cubicle_pg_restore_test.sh
```

Pass condition:

```text
OK: restore-test passed (... tables)
```

## 5. Monitoring

Script:

```bash
/root/projects/cubicle/scripts/monitor.sh
```

Checks:
- `https://cubiqlo.com/api/health` HTTP 200
- CPU threshold: 85%
- RAM threshold: 85%
- disk threshold: 90%
- Docker containers named `cubicle` are up
- health response includes `"db":"ok"` when present

Log:

```text
/root/projects/cubicle/scripts/monitor.log
```

Manual check:

```bash
/root/projects/cubicle/scripts/monitor.sh
```

Expected quiet/pass output:

```text
OK cpu=... ram=... disk=... http=200
```

## 6. Alerting

Backup script supports Telegram alert only when these env vars exist in cron environment:

```env
TELEGRAM_BOT_TOKEN=***
TELEGRAM_CHAT_ID=***
```

Current monitor script writes alerts to stdout/log. For external alerting, point Better Stack/UptimeRobot/ntfy to:

```text
https://cubiqlo.com/api/health
```

Recommended external monitor:
- interval: 1–5 minutes
- timeout: 10 seconds
- expected status: `200`
- alert target: Telegram/email/ntfy

## 7. Ops verification checklist

Before launch handoff:

- [x] Docker services healthy.
- [x] `/api/health` returns ok.
- [x] Hourly reminder cron installed.
- [x] Daily DB backup cron installed.
- [x] Weekly restore-test cron installed.
- [x] 5-minute monitor cron installed.
- [ ] Latest backup file verified after next scheduled run.
- [ ] Latest restore-test log verified after next scheduled run.
- [ ] External uptime monitor configured.
- [ ] Alert channel tested.

## 8. Emergency restore outline

Use only after deciding rollback needs DB restore.

1. Stop app writes / put app in maintenance mode if available.
2. Pick latest verified dump from `/root/backups/cubicle`.
3. Restore to staging/test container first if time allows.
4. Restore production Postgres from selected `.sql.gz`.
5. Re-run:

```bash
curl -sS https://cubiqlo.com/api/health
SMOKE_BASE_URL=https://cubiqlo.com npm run smoke
```

6. Record incident and backup file used in `CHANGELOG.md`.

