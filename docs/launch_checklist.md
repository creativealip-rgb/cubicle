# Cubicle / Cubiqlo — Final Launch Checklist

Last updated: 2026-06-29

Use this as release gate before calling current build launch-ready.

## 1. Release baseline

- [x] Latest deployed commit: `d8988ae chore: add production smoke script`
- [x] Production URL: `https://cubiqlo.com`
- [x] Docker service healthy: `cubicle-cubicle-1`
- [x] Postgres service healthy: `cubicle-pg`
- [x] `/api/health` returns ok
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `SMOKE_BASE_URL=https://cubiqlo.com npm run smoke` passes

## 2. Required launch env

Verify via Dokploy env panel and guarded endpoint.

- [ ] `DATABASE_URL`
- [ ] `BETTER_AUTH_SECRET`
- [ ] `BETTER_AUTH_URL=https://cubiqlo.com`
- [ ] `NEXT_PUBLIC_APP_URL=https://cubiqlo.com`
- [ ] `CRON_SECRET`
- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM`
- [ ] `PAKASIR_PROJECT`
- [ ] `PAKASIR_API_KEY`

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
- [ ] Verify no secret values appear in page HTML/browser bundle.
- [ ] Verify R2 bucket is private and no listing is exposed.
- [ ] Verify viewer role cannot mutate via direct request.
- [ ] Verify owner-only billing checkout in UI.
- [ ] Rotate demo passwords before real customer/demo handoff.

## 4. Core product smoke

Run with owner account in browser:

- [ ] login/logout works.
- [ ] dashboard loads KPIs.
- [ ] create client.
- [ ] create project under client.
- [ ] create task under project.
- [ ] upload internal file.
- [ ] upload client-visible file.
- [ ] add internal comment.
- [ ] add client-visible comment.
- [ ] project timeline shows internal events.
- [ ] enable/share client portal.
- [ ] client portal shows only visible project/task/file/comment/timeline.
- [ ] create invoice.
- [ ] send invoice email.
- [ ] open invoice public link incognito.
- [ ] manually send overdue reminder on overdue invoice.
- [ ] reports page loads collection health and P&L.
- [ ] billing page shows current plan and owner checkout.

## 5. Integration smoke

- [ ] Resend sends test email from verified `EMAIL_FROM`.
- [ ] Pakasir checkout creates payment URL/QRIS flow.
- [ ] Pakasir webhook upgrades plan on paid event.
- [ ] R2 upload/download works with signed URLs.
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
- [ ] Confirm latest backup file after next scheduled run.
- [ ] Confirm latest restore-test log after next scheduled run.
- [ ] Confirm external uptime monitor points to `/api/health`.
- [ ] Confirm alert channel works.

## 7. Docs gate

- [x] `README.md` updated.
- [x] `CHANGELOG.md` updated.
- [x] `HANDOVER.md` updated.
- [x] `docs/cubicle_env.md` updated.
- [x] `docs/cubicle_test_checklist.md` updated.
- [x] `docs/cubicle_remaining_plan.md` updated.
- [ ] Add final launch result note after all unchecked items pass.

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

Current state: **automated gate passed; manual/security/integration ops checks pending**.

