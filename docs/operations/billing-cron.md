# Billing recovery crons — operational guide

Scheduled operations for Pakasir payment recovery and expired-plan sweeping.
Both endpoints are `CRON_SECRET` protected (timing-safe bearer check via
`src/lib/cron-auth.ts`).

## What they do

### `GET /api/cron/pakasir-sync` — missed-webhook recovery

The live webhook (`/api/webhooks/pakasir`) is the primary activation path;
this cron is the safety net for webhooks that never arrived (provider outage,
network drop, deploy window). It scans pending `pakasir_payments` (bounded,
oldest first), re-fetches the provider transaction detail (fail-closed — never
trusts local state alone), and completes payments the provider confirms as
`completed` via the SAME shared activation helper the webhook uses, so both
paths are idempotent and can never diverge. Optional `?limit=` bounds the batch
(default 25, max 100).

### `GET /api/cron/expire-plans` — plan/add-on expiry sweep

Downgrades workspaces whose billing period has lapsed (existing grace-period
behavior preserved), sweeps expired storage add-ons, and releases
extra-workspace entitlements past period end — all in one pass.

## Scheduler (checked-in wrappers)

- `scripts/cron-pakasir-sync.sh` → `/api/cron/pakasir-sync`
- `scripts/cron-expire-plans.sh` → `/api/cron/expire-plans`

Both mirror `cron-reconcile-storage-quota.sh` conventions: load **only**
`CRON_SECRET` + URL from the env file (never `source` the whole file), curl
with the Bearer header, and never log the secret.

### Env

Scripts read `CRON_SECRET` plus `CUBIQLO_URL` **or** `CUBICLE_URL` from
`$SCRIPT_DIR/../.env.development.local` by default (override with
`ENV_FILE=/path/to/.env`). `CRON_SECRET` is required. When neither URL var is
set, scripts default to `https://dev.cubiqlo.com` — so a bare run always
targets dev, never production.

### Production guard

Both endpoints mutate billing state, so the wrappers refuse to run against
production (`https://cubiqlo.com` or `https://www.cubiqlo.com`) unless
`ALLOW_PRODUCTION_BILLING_CRON=1` is set in the environment. This is an
unconditional guard (it applies on every run, not only under an `--apply`
flag) because neither endpoint has a dry-run mode.

### Suggested crontab (staggered from the :00 reminders and :05 reconcile jobs)

```cron
# Pakasir missed-webhook sync, hourly
10 * * * * /root/projects/cubicle/scripts/cron-pakasir-sync.sh >> /var/log/cubicle-cron.log 2>&1
# Expired plan/add-on sweep, hourly
20 * * * * /root/projects/cubicle/scripts/cron-expire-plans.sh >> /var/log/cubicle-cron.log 2>&1
```

Do **not** install this crontab on a host that points at production unless
`ALLOW_PRODUCTION_BILLING_CRON=1` has been explicitly set (and only after the
release gates in `docs/plans/2026-08-11-cubiqlo-final-billing-storage-plan.md`
pass).

## Verification

```bash
# Syntax check
bash -n scripts/cron-pakasir-sync.sh scripts/cron-expire-plans.sh

# Live run against dev (dev defaults; expect {"ok":true,...} from each)
ENV_FILE=/root/projects/cubicle/.env.development.local \
  scripts/cron-pakasir-sync.sh
ENV_FILE=/root/projects/cubicle/.env.development.local \
  scripts/cron-expire-plans.sh

# Production refusal must fail loudly:
ALLOW_PRODUCTION_BILLING_CRON= CUBIQLO_URL=https://cubiqlo.com \
  CRON_SECRET=x scripts/cron-pakasir-sync.sh; echo "exit=$?"   # exit=1
```

Expected healthy dev response shape:

```json
{"ok":true,"scanned":0,"completed":0,"failed":0}   // pakasir-sync
{"ok":true,"downgraded":0,"workspaceIds":[],"storage":{...},"extraWorkspace":{...}}  // expire-plans
```

## Files

- `scripts/cron-pakasir-sync.sh` — Pakasir sync scheduler wrapper
- `scripts/cron-expire-plans.sh` — plan/add-on expiry sweep wrapper
- `src/app/api/cron/pakasir-sync/route.ts` — cron endpoint (bounded scan)
- `src/app/api/cron/expire-plans/route.ts` — cron endpoint (downgrade + sweeps)
- `src/lib/pakasir-sync.ts` — shared provider activation (webhook + cron path)
- `src/lib/cron-auth.ts` — timing-safe CRON_SECRET bearer verification
