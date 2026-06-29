# Changelog

## 2026-06-29 — Phase 3F launch QA execution

- Added `docs/launch_qa_result.md` with launch QA evidence and remaining manual/credentialed checks.
- Verified production Docker health, `/api/health`, guarded env audit, backup checksum, restore test, monitor script, smoke, lint, build, and public HTML secret-name scan.
- Updated final launch checklist to conditional pass: automated/env/backup/restore checks pass; credentialed product QA and external alert test still pending.

## 2026-06-29 — Phase 3E backup/monitor ops sync

- Added `docs/cubicle_ops.md` covering production services, cron jobs, backup, restore test, monitoring, alerting, and emergency restore outline.
- Verified host crontab has hourly reminders, daily DB backup, weekly restore-test, and 5-minute monitor jobs.
- Updated final launch checklist ops gate with active cron status.
- Fixed `scripts/cron-reminders.sh` to send `Authorization: Bearer ${CRON_SECRET}` correctly.

## 2026-06-29 — Phase 3D final launch checklist

- Added `docs/launch_checklist.md` as final release gate.
- Checklist covers baseline, env, security, core product, integrations, ops, docs, rollback, and launch decision.
- Current state marked: automated gate passed; manual/security/integration ops checks pending.

## 2026-06-29 — Phase 3C smoke test script

- Added `scripts/smoke.mjs` and `npm run smoke`.
- Smoke checks cover public routes, health, unauthenticated app redirect, invalid public tokens, guarded env audit, and cron guard behavior.
- Updated `docs/cubicle_test_checklist.md` with automated smoke command and manual smoke boundaries.

## 2026-06-29 — Phase 3B env/security hardening

- Added safe environment audit helper and guarded endpoint:
  - `/api/health/env`
  - requires `Authorization: Bearer $CRON_SECRET`
  - returns only env names/statuses, never secret values
- Added production-required env checks for DB, auth, app URL, cron secret, R2, Resend, and Pakasir.
- Hardened cron routes so missing `CRON_SECRET` locks cron endpoints in production instead of leaving them open.
- Updated `.env.example` with `CRON_SECRET`.
- Rewrote `docs/cubicle_env.md` with current production env names, guarded endpoints, and launch checklist.
- Verified:
  - `npm run lint` ✅
  - `npm run build` ✅

## 2026-06-29 — Phase 2C–2G + Phase 3A

- Added invoice overdue reminder system:
  - `/api/cron/invoice-overdue`
  - auto-mark `sent/viewed` invoices as `overdue`
  - manual `Remind` button on invoice detail
  - reminder email to client
  - fresh invoice share link per reminder
  - in-app notifications + activity logs
- Added project timeline events:
  - internal timeline tab on project detail
  - activity-log based feed for project/task/file/comment/time events
  - client portal timeline with client-safe allowlist
  - hides internal-only tasks/files/comments/activity from portal
- Polished reports dashboard:
  - quick actions for new invoice and expense logging
  - collection health KPI
  - overdue total/rate metrics
  - comparable monthly P&L bars
- Completed QA/lint cleanup:
  - `npm run lint` passes
  - `npm run build` passes
  - unused imports/vars cleaned across app/actions/components
- Hardened onboarding + billing:
  - onboarding saves workspace name via server action
  - workspace name validation + UI error state
  - activity log `completed_onboarding`
  - fake onboarding delay removed
  - billing checkout disabled for non-owner users
- Latest commits:
  - `b8fdad6 feat: add invoice overdue reminders`
  - `3c07119 feat: add project timeline events`
  - `233c2ad feat: show client portal timeline`
  - `8110e11 feat: polish reports dashboard`
  - `8258e71 chore: clean up lint warnings`
  - `0be4460 feat: harden onboarding and billing`

### Verification

- `npm run lint` ✅
- `npm run build` ✅
- Docker Compose rebuild/recreate ✅
- `cubicle-cubicle-1` healthy ✅
- `cubicle-pg` healthy ✅
- `/api/health` returned `{"ok":true}` ✅

## 2026-06-27 — Internal localization + Docker redeploy

- Localized internal invoice UI (`/app/invoices`, `/app/invoices/[invoiceId]`) to Indonesian for owner/member workspace use.
- Replaced `$` symbol output in shared app currency formatter with ISO currency prefix for non-IDR currencies (e.g. `USD 1,000.00`) while keeping `Rp` for IDR.
- Added Indonesian date helper (`formatDateID`) and applied it to invoice list/detail dates.
- Localized invoice actions/modals: add item, import time entries, record payment, share-link generation/revoke, notes/terms empty state.
- Localized invoice status labels: `Terkirim`, `Dilihat`, `Terlambat`, `Lunas`, `Dibatalkan`, `Perlu dibayar`; `Draft` intentionally kept.
- Localized internal proposal pages (`/app/proposals`, `/app/proposals/new`, `/app/proposals/[proposalId]`) for headings, empty states, table labels, status date labels, outcome/decline text.
- Fixed accidental identifier replacements from broad copy pass (`hourlyRate`, `CardTitle`, `downPaymentPercent`, `declineReason`).
- Verified locally:
  - `npx tsc --noEmit` ✅
  - `npm run lint` ✅ (0 errors; 8 pre-existing `<img>` warnings)
  - `npm run build` ✅
- Committed and pushed:
  - `0e16805 fix: localize invoice and proposal UI`
- Docker production rebuild/recreate done on VPS:
  - image `cubicle-cubicle:latest` → `a7eaf5cd3a5e`
  - container `cubicle-cubicle-1` recreated and healthy
  - health check `https://cubiqlo.com/api/health` returned `{"status":"ok","db":"ok"}`

### Notes

- Public/client-facing routes are still intended to stay English unless product direction changes.
- Dokploy/Docker warning remains: Next.js `middleware` convention deprecated in favor of `proxy`; non-blocking.
- Existing lint warnings remain for `<img>` usage in landing/sidebar/auth components; unrelated to this change.
