# Billing Integrity Revision — Dev Evidence Log (2026-08-13)

Date: 2026-08-13
Branch: `fix/landing-id-headline-underline`
Baseline: `8cd4862` (landing doc canvas); this revision's commits follow it.

## Implementation commits (9, oldest → newest)

| Commit | Subject |
|---|---|
| `a830939` | fix: align billing entitlements and workspace limits |
| `23ab270` | fix: harden billing period and checkout |
| `f5bb86f` | fix: align billing UI and pricing copy |
| `8e93cc0` | fix: stop unfunded addon renewal |
| `325bd32` | fix: prevent stale payment plan downgrade |
| `1d7cb7d` | fix: expire stale Pakasir payments |
| `147fcee` | ops: schedule Cubiqlo billing recovery crons |
| `9c7a211` | fix: use cron secret in billing schedulers |
| `fa39564` | fix: migrate addon renewal default |

HEAD at evidence time: `fa39564`. Dev integration merge: `d1b1b55`.

## Source gates — PASS

- Focused Gate A suite: 104/104 tests passed (parent session evidence).
- Additional source batch: 71/71 tests passed.
- Lifecycle suites: 23/23 passed.
- Scheduler suites: 4/4 passed (`billing-cron-scheduler.test.ts` 4 tests; live re-run PASS).
- `npx tsc --noEmit`: PASS (exit 0).
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Migration — PASS (dev)

- Backup: `/root/backups/databases/cubiqlo-manual/cubicle_dev-billing-20260813T122100Z.dump`
- SHA-256: `0784f403f9ce7f1bc4536fb996cca5b9d617013062b01057fbb3269d87ef9ea3`
- Restore-test into disposable DB: PASS (dump restored; disposable DB removed).
- Migration `0077_disable_unfunded_addon_autorenew.sql` applied to `cubiqlo-new-pg/cubicle_dev` at `2026-08-13 12:24:26Z` (ledger `cubiqlo_migrations`).
- `user_storage_addons.auto_renew` default = `false`; `user_extra_workspace_entitlements.auto_renew` default = `false`.
- Ledger/columns/defaults verified live in `cubicle_dev`.

## Dev deploy — PASS

- Dev source: merge commit `d1b1b55` (`org.opencontainers.image.revision:d1b1b55d673e9ee4046fec36805a7425f22a3b0b`).
- Dev image: `cubicle-dev:prod`, image `sha256:65e425bccab78f252e3b5c5b457b98e03a204886a2345a4972204172d9b317a0`, built 2026-08-13T12:25:45Z.
- Container `cubicle-dev`: Up, healthy.
- Health: `https://dev.cubiqlo.com/api/health` → `{"status":"ok","db":"ok"}`.
- Production container `cubiqlo-new-app` unchanged (`cubicle-cubiqlo:landing-preview-fix`, up 3 days); `dokploy-traefik` sole owner of ports 80/443; `https://cubiqlo.com` + `https://app.cubiqlo.com` health ok.

## Browser smoke — PASS

- Login smoke: PASS.
- Billing toggles (monthly/yearly period selector, add-on selector): PASS.

## Runtime / provider — OPEN

- 16 stale `pending` `pakasir_payments` rows in `cubicle_dev` (pending 16 / completed 6 / cancelled 1).
- Live `pakasir-sync` cron run: `{"ok":true,"scanned":16,"activated":0,...,"errored":16}` — all 16 errored with `Pakasir detail HTTP 404: {"message":"Transaksi tidak ditemukan"}` (provider no longer has these transactions).
- NOT complete: real provider payment, verified webhook completion, webhook replay idempotency, cancel, expiry, browser QA with DB proof.

## Production — BLOCKED

- No migration, deploy, restart, cron install, or payment mutation on production.
- Explicit approval still required before any production action.

## Gate summary

| Gate | Status |
|---|---|
| A — Source | PASS (104/104 + 71/71, lifecycle 23/23, scheduler 4/4, tsc/build/diff) |
| B — Migration | PASS (dev backup SHA-256 `0784f403…`, restore-test, 0077 applied, defaults false) |
| C — Dev deploy | PASS (d1b1b55 / sha256:65e…, health ok, prod unchanged) |
| D — Acceptance | PARTIAL (browser smoke PASS; provider runtime proof OPEN) |
| E — Production | BLOCKED (Gates A–D + explicit approval required) |

## Scope note

- Untracked `docs/operations/evidence/ui-phase0-2026-08-12/` preserved untouched.
- No code changes in this task; plan/log/docs only.
