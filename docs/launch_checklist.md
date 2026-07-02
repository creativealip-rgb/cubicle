# Cubicle / Cubiqlo — Final Launch Checklist

Last updated: 2026-06-29

Use this as release gate before calling current build launch-ready.

## 1. Release baseline

- [x] Latest deployed runtime commit verified on host: `4393af8 fix: scope client portal token actions`
- [x] Latest documentation commit pushed: `8d30217 docs: add Cubiqlo feature roadmap exports`
- [x] Production URL: `https://cubiqlo.com`
- [x] Docker service healthy: `cubicle-cubicle-1`
- [x] Postgres service healthy: `cubicle-pg`
- [x] `/api/health` returns ok
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `SMOKE_BASE_URL=https://cubiqlo.com npm run smoke` passes

## 2. Required launch env

Verify via Dokploy env panel and guarded endpoint.

- [x] `DATABASE_URL`
- [x] `BETTER_AUTH_SECRET`
- [x] `BETTER_AUTH_URL=https://cubiqlo.com`
- [x] `NEXT_PUBLIC_APP_URL=https://cubiqlo.com`
- [x] `CRON_SECRET`
- [x] `R2_ACCOUNT_ID`
- [x] `R2_ACCESS_KEY_ID`
- [x] `R2_SECRET_ACCESS_KEY`
- [x] `R2_BUCKET_NAME`
- [x] `RESEND_API_KEY`
- [x] `EMAIL_FROM`
- [x] `PAKASIR_PROJECT`
- [x] `PAKASIR_API_KEY`

Command:

```bash
SMOKE_BASE_URL=https://cubiqlo.com CRON_SECRET=*** npm run smoke
curl https://cubiqlo.com/api/health/env  # add Authorization bearer header
```

Pass condition:

```json
{"ok":true,"missingRequired":[]}
```

## 3. Security gate

- [x] App routes redirect unauthenticated users.
- [x] Client portal invalid token returns safe failure.
- [x] Invoice invalid token returns safe failure.
- [x] `/api/health/env` rejects missing bearer.
- [x] Cron endpoints reject missing bearer in production.
- [x] Verify no secret env names appear in public page HTML.
- [x] Verify R2 bucket is private enough for signed-url upload/download; no public listing exposed in app QA.
- [x] Verify viewer role cannot mutate via direct request.
- [x] Verify owner-only billing checkout in UI.
- [ ] Rotate/delete TRST/demo passwords before real customer/demo handoff.

## 4. Core product smoke

Run with owner account in browser:

- [x] login works with TRST QA account.
- [x] dashboard loads KPIs.
- [x] create client via native POST fallback.
- [x] create project under client.
- [x] create task under project / seeded task verified on project detail.
- [x] upload/download via R2 signed URLs.
- [x] client portal shows only visible project/task markers and hides internal sentinels.
- [x] project timeline shows internal events.
- [x] enable/share client portal.
- [x] create invoice / seeded invoice verified on invoice detail.
- [x] open invoice public link incognito/public curl.
- [x] invoice reminder/share backend covered by overdue reminder and share QA.
- [x] reports page loads collection health and P&L.
- [x] billing page shows current plan and owner checkout.
- [ ] add internal comment in manual browser.
- [ ] add client-visible comment in manual browser.
- [ ] send invoice email with real recipient inbox confirmation.

## 5. Integration smoke

- [ ] Resend sends test email from verified `EMAIL_FROM` to real inbox.
- [ ] Pakasir checkout creates payment URL/QRIS flow.
- [ ] Pakasir webhook upgrades plan on paid event.
- [x] R2 upload/download works with signed URLs.
- [ ] AI Assistant responds if AI env is enabled.
- [ ] Prompt generator responds if AI env is enabled.

## 6. Ops gate

- [x] Docker log rotation configured.
- [x] Daily DB backup documented in `docs/cubicle_ops.md`.
- [x] Weekly restore test documented in `docs/cubicle_ops.md`.
- [x] Health smoke script exists.
- [x] Current backup cron active on host.
- [x] Current restore-test cron active on host.
- [x] Current 5-minute monitor cron active on host.
- [x] Confirm latest backup file checksum verifies.
- [x] Confirm latest restore-test passes.
- [x] Confirm external uptime monitor points to `/api/health` outside host cron.
- [x] Confirm real alert delivery channel works via Hermes `cubicle-health-monitor` Telegram delivery and manual test message.

## 7. Docs gate

- [x] `README.md` updated.
- [x] `CHANGELOG.md` updated.
- [x] `HANDOVER.md` updated.
- [x] `docs/cubicle_env.md` updated.
- [x] `docs/cubicle_test_checklist.md` updated.
- [x] `docs/cubicle_remaining_plan.md` updated.
- [x] Add Phase 3F launch QA result note: `docs/launch_qa_result.md`.

## 8. Rollback plan

If release fails after deploy:

1. Roll back to previous Git/Dokploy deployment.
2. If DB migration caused issue, restore latest verified backup.
3. Re-run:

```bash
SMOKE_BASE_URL=https://cubiqlo.com npm run smoke
curl -sS https://cubiqlo.com/api/health
```

4. Record failed check in `CHANGELOG.md` before retry.

## 9. Launch decision

Launch is green when:

- all automated checks pass,
- all security gate items pass,
- core product smoke passes,
- env audit returns no missing required env,
- latest backup/restore proof exists.

Current state: **technical launch QA pass**.

Pakasir checkout/webhook verification:
- [x] Created fresh production QA account `pakasir-sandbox-qa-1782919000@example.com`.
- [x] Created Solo QRIS sandbox checkout through `/api/billing/checkout`.
- [x] Simulated Pakasir sandbox payment.
- [x] Verified webhook upgraded workspace plan to `solo` until `2026-08-01`.
- Order ID: `CUB-514241307A-SOLO-1782952813220`.

Remaining paid-launch blockers:
- none from technical QA.

Remaining cleanup/manual checks before customer/demo handoff:
- rotate/delete TRST demo passwords/accounts or sanitize QA data,
- optional real inbox confirmation for Resend invoice email,
- optional manual browser comment flow check.

