# Storage-quota reconcile cron — operational guide

Scheduled operation for the age-gated storage reservation reconciler.
Endpoint: `GET /api/cron/reconcile-storage-quota` (CRON_SECRET protected).

## What it does

`workspace_storage_usage.reserved_bytes/reserved_files` are **transient** by
contract: nonzero only while an upload transaction is in flight. Committed
`files` rows are the source of truth. The reconciler zeroes **stale**
reservations only — nonzero counters whose `updated_at` is at least **5
minutes** old. In-flight uploads (younger than the gate) are never touched,
and the apply-time UPDATE repeats the age predicate atomically so a
reservation touched mid-reconcile is not clobbered. It never touches the
`files` table. See `references/storage-quota-reconcile-2026-08-11.md` for the
full design.

## Scheduler (checked-in wrapper)

`scripts/cron-reconcile-storage-quota.sh` — mirrors `cron-reminders.sh`
conventions (loads only `CRON_SECRET`/`CUBICLE_URL` from the env file, curls
with the Bearer header).

- **Default = dry run** (`?dryRun=1`): reports `scanned/active/stale/applied`
  and never mutates a row.
- **`--apply`**: explicit opt-in; calls the endpoint with NO `dryRun` param
  (the cron route applies by default). Zeroes only stale reservations.
- **Production apply guard**: `--apply` against `https://cubiqlo.com`
  refuses unless `ALLOW_PRODUCTION_RECONCILE=1` (mirrors
  `scripts/reconcile-storage-quota.ts`).

### Suggested crontab (staggered from the :00 reminders job)

```cron
# Dry-run report, hourly (cheap, no writes)
5 * * * * /root/projects/cubicle/scripts/cron-reconcile-storage-quota.sh >> /var/log/cubicle-cron.log 2>&1
# Explicit apply schedule — pick ONE, off-peak (19:30 UTC = 02:30 WIB)
30 19 * * * /root/projects/cubicle/scripts/cron-reconcile-storage-quota.sh --apply >> /var/log/cubicle-cron.log 2>&1
```

Install the apply line **only after** the dry-run line has been observed
reporting `stale: 0` (or `stale: N` with a known, confirmed leak) for at
least one full day.

### Env

Script reads `CRON_SECRET` + `CUBICLE_URL` from
`$SCRIPT_DIR/../.env.development.local` by default (override with
`ENV_FILE=/path/to/.env`). Both are required.

## Dev gotcha: the compose CRON_SECRET override (fixed 2026-08-11)

`docker-compose.dev.yml` used to pin `CRON_SECRET: ""` in the service
`environment:` block. In Compose, `environment:` values **override**
`env_file:` values — so the real secret in `.env.development.local` was
silently nulled and, because dev runs `NODE_ENV=production`, every
`/api/cron/*` route returned **503 "Cron secret is not configured"**.

The empty pin has been removed. The dev container now gets `CRON_SECRET`
from `.env.development.local` (the same source production compose uses via
`${CRON_SECRET:-}`).

**Deploy boundary (2026-08-11):** the running `cubicle-dev` container is
still the old image with `CRON_SECRET=*** (len 0)`. This change takes effect
on the next dev build/recreate via
`scripts/operations/deploy-dev-integration.sh` (dev/integration owner only —
feature agents must not run it). Until then, live verification of the dev
cron endpoint returns 503, and the scheduler script cannot authenticate
against dev.

## Verification

```bash
# After next dev deploy — expect {"ok":true,"dryRun":true,...}
ENV_FILE=/root/projects/cubicle/.env.development.local \
  scripts/cron-reconcile-storage-quota.sh
# Expect a nonzero scanned count and, in a healthy DB, stale: 0 / applied: 0.

# Live endpoint check (behind Traefik, no Basic Auth on this route):
CRON=$(grep '^CRON_SECRET=' .env.development.local | cut -d= -f2-)
curl -sS -H "Authorization: Bearer $CRON" \
  "https://dev.cubiqlo.com/api/cron/reconcile-storage-quota?dryRun=1"
```

Expected healthy dry run:

```json
{"ok":true,"dryRun":true,"scanned":32,"active":0,"stale":0,"applied":0,"rows":[...]}
```

## Files

- `scripts/cron-reconcile-storage-quota.sh` — scheduler wrapper (this doc's subject)
- `scripts/reconcile-storage-quota.ts` — CLI (`npm run reconcile:storage-quota [--apply]`)
- `src/lib/storage-quota-reconcile.ts` — reconcile lib (age gate, dry-run default)
- `src/app/api/cron/reconcile-storage-quota/route.ts` — cron endpoint
- `docker-compose.dev.yml` — dev env (CRON_SECRET now flows from env_file)
