# Cubicle / Cubiqlo — Launch QA Result

Last updated: 2026-06-29

Scope: Phase 3F launch QA checks executable from CLI/host without using customer credentials.

## Result summary

Status: **launch QA pass, with billing/webhook manual verification still pending**.

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
- client creation no-JS/native POST flow passed
- invoice share backend token generation passed
- public invoice link passed
- R2 direct upload/download/delete passed
- client portal visibility/leakage check passed
- external monitor/manual alert script check passed

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

Phase 3I/3K follow-up QA added:
- project creation modal now shows workspace client select, and project creation via selected client produced `Project dibuat`
- invoice share token generation produced a public invoice link and public invoice page loaded
- fixed fresh-account workspace bootstrap race after duplicate `workspaces_slug_unique` was observed
- fresh signup/login after fix loaded dashboard with workspace name correctly
- client creation through fresh account succeeded when form submit was dispatched; browser element click still had automation inconsistency, so manual browser check remains recommended

Phase 3M/3L final QA added:
- client creation moved to dedicated `/app/clients/new` page with classic POST fallback; production DB row created successfully
- invoice share native route fixed to authenticate directly from route request headers and update token hash directly
- invoice `TRST-P3L-1782725600` has active share hash and public invoice page returned 200 with invoice/client data
- R2 QA uploaded, downloaded, compared, and deleted object `qa/phase3l-1782731906038.txt`
- client portal `/client-portal/trst-phase3l-portal` returned 200, showed visible project/task markers, and hid internal leak sentinels
- monitor script returned `OK cpu=8% ram=66% disk=77% http=200`

Phase 3N viewer mutation guard QA added:
- created fresh TRST viewer account and attached it to existing QA workspace as `viewer`
- patched `/api/settings/reply-to` to require workspace owner
- patched `/api/ai/action` to require owner/member access before task status updates or invoice-reminder sends
- direct viewer requests returned 403 for reply-to update, AI task status update, and AI invoice reminder send

Still requires manual verification before paid launch:
- Pakasir checkout/webhook full flow
- real external uptime alert delivery channel, if not covered by cron delivery

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
OK cpu=8% ram=66% disk=77% http=200
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

### Phase 3L public invoice link

```text
GET /invoice/[redacted-token] -> 200
invoice: TRST-P3L-1782725600
status after view: viewed
client: TRST Phase3M2 Native Client 1782725507
```

### R2 upload/download/delete

```json
{"key":"qa/phase3l-1782731906038.txt","uploaded":true,"downloaded":true,"deleted":true,"bytes":27}
```

### Client portal leakage check

```json
{"visibleProject":true,"visibleTask":true,"internalProjectLeak":false,"internalTaskLeak":false}
```

## Launch decision

Current launch status: **technical launch QA pass**.

Remaining paid-launch caveats:
- Pakasir checkout/webhook still needs live-payment verification.
- Real external alert delivery channel still needs confirmation if not covered by cron stdout delivery.
