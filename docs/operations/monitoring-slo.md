# Cubiqlo Monitoring and Beta SLO

## Scope

Production monitor source:

- `scripts/operations/cubiqlo_observability_watchdog.sh`
- Hermes no-agent cron: `cubiqlo-production-observability`
- Schedule: every 5 minutes
- Delivery: Telegram origin/home channel
- Healthy runs are silent; alerts repeat after 15 minutes while unresolved.

## Active checks

1. `https://cubiqlo.com/` returns `200`.
2. `https://cubiqlo.com/login` returns `200`.
3. `/api/health` reports app and database `ok`.
4. Anonymous `/api/time/active` returns `401` as synthetic auth-boundary proof.
5. App and PostgreSQL containers are healthy.
6. Dokploy Redis service has `1/1` replicas.
7. PostgreSQL active connections stay below 80% of `max_connections`.
8. Root disk stays below 90% and host memory below 90%.
9. Latest local PostgreSQL backup is newer than 26 hours and checksum-valid.
10. Dokploy Traefik produces fewer than 10 matching `5xx` responses in five minutes.

Docker Compose retains app/database logs as three files of 10 MiB per container. Traefik and provider-level retention remain infrastructure concerns.

## Beta SLO

Initial monthly targets:

- Availability: **99.5%** for landing, login, and health endpoint.
- Health probe interval: 5 minutes.
- Alert detection target: under 10 minutes.
- Alert acknowledgement target: 30 minutes during actively supported hours.
- Restore objective: existing disaster-recovery target applies; this monitor only detects stale/invalid local backup state.

A 99.5% monthly availability target permits about 3 hours 39 minutes downtime in a 30-day month. Planned maintenance must be recorded separately.

## Alert response

1. Confirm public `/api/health`, landing, and login status.
2. Check `cubicle-cubicle-1`, `cubicle-pg`, `dokploy-redis`, and `dokploy-traefik`.
3. For a deploy regression, use `/root/releases/cubiqlo/previous.env` and the health-gated deployment procedure.
4. For DB saturation, inspect `pg_stat_activity` before terminating sessions.
5. For stale backup, inspect local backup cron and encrypted offsite backup logs.
6. For disk alerts, inspect Docker/build cache and backup retention; never delete DB volumes.

## Controlled alert proof

On 25 July 2026:

```bash
STATE_DIR=/tmp/cubiqlo-observability-self-test \
  scripts/operations/cubiqlo_observability_watchdog.sh --self-test
```

produced:

```text
ALERT Cubiqlo production | controlled monitoring self-test
```

Telegram delivery succeeded with message ID `47737`. App and database were not interrupted.

## Uptime Kuma checks

The existing Uptime Kuma instance now has three active five-minute Cubiqlo monitors:

- `Cubiqlo Landing` — HTTP `200`.
- `Cubiqlo Login` — HTTP `200`.
- `Cubiqlo Health + DB` — HTTP `200` plus `"db":"ok"` keyword.

Initial heartbeat verification returned `up` for all three monitors. Kuma data persists in its existing Docker volume. No notification provider is configured in Kuma; Telegram alert delivery remains handled by the Hermes watchdog.

## Remaining gaps

- Both Hermes watchdog and Uptime Kuma currently run on the production VPS, so neither can detect total VPS/network/provider loss. Add a true off-host probe later, using Uptime Kuma on another host or an external uptime provider.
- Sentry/server-client error tracking is not configured. Add only after DSN/project ownership and data-retention policy are approved.
- The Traefik `5xx` check depends on current log format and should be replaced by structured access-log metrics when traffic grows.
- Synthetic auth verifies anonymous denial, not a credentialed login journey. Add a dedicated non-production synthetic account before automating sign-in.
