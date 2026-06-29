# Cubicle / Cubiqlo — Launch QA Result

Last updated: 2026-06-29

Scope: Phase 3F launch QA checks executable from CLI/host without using customer credentials.

## Result summary

Status: **conditional pass**.

Passed:
- production Docker services healthy
- public health endpoint healthy
- guarded env audit ok with no missing required env
- latest DB backup file exists and checksum verifies
- restore test passed against latest backup
- monitor script passed
- shell syntax for ops scripts passed
- automated production smoke passed
- lint passed
- build passed
- public HTML secret-name scan passed

Phase 3G credentialed QA added:
- new `TRST QA` test account created through production signup
- email verification set true in DB for QA account
- login succeeded on production domain
- dashboard loaded for new workspace
- clients page loaded for new workspace
- billing page loaded and owner QRIS buttons visible
- reports page loaded and quick actions visible

Phase 3H deeper QA added:
- created client through production UI: `TRST Deep QA Client`
- verified client detail page loads
- seeded QA project/task/invoice for page verification after UI project form could not complete selection cleanly in browser automation
- verified project detail page loads with task count and `TRST Deep QA Task`
- verified invoice detail page loads with generated invoice number
- observed invoice share-link button click did not create token in this browser run; needs follow-up with manual browser/devtools check

Still requires deeper credentialed/manual browser QA:
- project/task creation through UI without automation limitations
- file upload/download through R2
- client portal share link full flow
- invoice share link/send/reminder full flow
- Pakasir checkout/webhook full flow
- viewer direct mutation guard with viewer session cookie
- external uptime alert channel test

## Evidence

### Docker

```text
cubicle-cubicle-1 Up ... (healthy)
cubicle-pg Up ... (healthy)
```

### Health

```json
{"status":"ok","db":"ok"}
```

### Env audit

Guarded endpoint with bearer returned:

```json
{"ok":true,"missingRequired":[]}
```

No secret values recorded.

### Backup proof

Latest verified backup:

```text
/root/backups/cubicle/cubicle_20260628T191501Z.sql.gz
/root/backups/cubicle/cubicle_20260628T191501Z.sql.gz: OK
```

### Restore proof

```text
Testing restore of: /root/backups/cubicle/cubicle_20260628T191501Z.sql.gz
users              5
workspaces         2
clients            4
projects           5
tasks              19
invoices           10
time_entries       10
files              9
OK: restore-test passed (38 tables)
```

### Monitor

```text
OK cpu=66% ram=74% disk=76% http=200
```

### Smoke

Command:

```bash
SMOKE_BASE_URL=https://cubiqlo.com npm run smoke
```

Passed checks:
- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/api/health`
- `/app/dashboard` unauthenticated redirect
- invalid `/client-portal/[token]`
- invalid `/invoice/[token]`
- `/api/health/env` guarded 401
- `/api/cron/invoice-overdue` guarded 401

### Quality gates

```text
npm run lint  ✅
npm run build ✅
```

### Public HTML secret-name scan

Scanned:
- `/`
- `/login`
- `/signup`
- `/forgot-password`

Needles:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `CRON_SECRET`
- `R2_SECRET_ACCESS_KEY`
- `RESEND_API_KEY`
- `PAKASIR_API_KEY`

Result: no hits.

## Launch decision

Current launch status: **conditional pass; ready for final credentialed product QA and external alert test**.

Do not call full launch green until manual browser QA and billing/email/R2/Pakasir flows are verified with real credentials.
