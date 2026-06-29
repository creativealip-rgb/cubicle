# Changelog

## 2026-06-29 — Phase 3N viewer mutation guards

- Guarded `/api/settings/reply-to` with authenticated workspace-owner authorization before mutating workspace reply-to email.
- Guarded `/api/ai/action` task-status updates and invoice-reminder sends with owner/member workspace write checks.
- Verified fresh TRST viewer account receives 403 for reply-to update, AI task status update, and AI invoice reminder direct requests.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.

## 2026-06-29 — Phase 3L final launch QA

- Fixed native invoice share route auth by reading session from route request headers and updating invoice token hash directly.
- Verified production public invoice link for `TRST-P3L-1782725600` returned 200 and marked invoice viewed.
- Verified R2 upload/download/delete against production bucket with disposable QA object.
- Verified client portal visibility allowlist: visible project/task shown, internal project/task sentinels hidden.
- Verified monitor script healthy on production host.
- Updated launch QA decision to technical launch QA pass with remaining paid-launch caveats for Pakasir live payment, viewer mutation guard, and real external alert delivery.

## 2026-06-29 — Phase 3M client creation native fallback

- Moved client creation from flaky modal/hydration flow to dedicated `/app/clients/new` page.
- Added classic POST route `/api/clients/create` so core client creation works without client-side JS.
- Verified production DB row for `TRST Phase3M2 Native Client 1782725507`.
- Verified lint, build, Docker health, `/api/health`, and production smoke after deploy.

## 2026-06-29 — Phase 3K workspace bootstrap hardening

- Made workspace auto-bootstrap idempotent: reuse existing owner workspace, recover existing slug, and insert membership with conflict ignore.
- Fixed fresh-account workspace race that could raise duplicate `workspaces_slug_unique` and break first client/project actions after signup.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.
- Production QA: fresh signup/login works; client creation succeeds when form submit fires; project creation select and invoice share flow remained usable from Phase 3J retest.

## 2026-06-29 — Phase 3I project form + invoice share action fixes

- Replaced project creation client ID text field with workspace client select when creating projects from `/app/projects`.
- Set invoice share-link generate/revoke buttons to `type="button"` to prevent accidental form-submit behavior in nested/interactive layouts.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.

## 2026-06-29 — Phase 3H deeper product QA pass

- Created `TRST Deep QA Client` through production UI.
- Verified client detail, project detail with task count, and invoice detail page using TRST QA account.
- Seeded QA project/task/invoice records for page verification after browser automation could not complete project select cleanly.
- Noted invoice share-link click did not create token in this browser run; kept as manual follow-up.
- Updated `docs/launch_qa_result.md` with Phase 3H status.

## 2026-06-29 — Phase 3G test account + credentialed QA smoke

- Created new `TRST QA` production test account via signup and marked email verified for QA.
- Verified login, dashboard, clients page, billing owner buttons, and reports quick actions on production.
- Updated `docs/launch_qa_result.md` with credentialed QA smoke status and remaining deeper manual checks.

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
