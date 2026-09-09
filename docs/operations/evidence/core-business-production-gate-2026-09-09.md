# Cubiqlo Core Business Production Gate — 2026-09-09

## Verdict

**PASS** for requested core workflows on `https://app.cubiqlo.com`.

## Runtime

- App container: `cubiqlo-new-app-next`
- Product image: `cubiqlo-prod:sha-111868b9ece4bc56b3865dbd12503ce4e8d866cc`
- Product fix commits: `66abf6a`, `111868b`
- Final E2E specs commit: `cad9a8b`
- Network: `dokploy-network`, no host port bindings
- Public proxy: `dokploy-traefik` only owner of ports 80/443
- Health proof: `{"status":"ok","db":"ok"}`

## Covered workflows

| Workflow | Production result |
|---|---|
| Client | PASS — create, detail redirect, reload, edit, permanent delete |
| Project | PASS — create, client link, detail persistence |
| Task | PASS — create from project Tasks tab, reload, edit, reload, delete |
| Time | PASS — approved/manual billing eligibility and invoice chain |
| Invoice | PASS — draft, line-item persistence, payment state, void |
| Payment | PASS — partial payment retained as accounting history |
| Expense | PASS — create, receipt upload, edit, reload, delete |
| Proposal | PASS — draft, editor autosave, reload, detail, delete |
| Contract | PASS — draft, editor autosave, reload, detail, delete |
| Client Portal | PASS — password setup, public unlock, client identity |
| Portal Files | PASS — upload and visibility |
| Global Files | PASS — upload, reload, search, exact download body, permanent delete |
| Calendar | PASS — public booking, internal visibility, ICS, cancellation |
| Reports | PASS — current-year filter after invoice/payment mutation |
| Fixed / Hourly / Retainer billing | PASS — critical production suite |

## Global Files production defect fixed

Workspace-root files were fetched but deliberately discarded:

```tsx
files={(!clientId && !projectId && !folderId) ? [] : finalFiles}
```

Current contract:

```tsx
export const dynamic = "force-dynamic";
<FileList files={finalFiles} />
```

Regression: `src/lib/files-page-dynamic-wiring.test.ts`.

## Fresh final production run

```bash
BASE_URL=https://app.cubiqlo.com \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/local/bin/chromium \
ALLOW_PRODUCTION_QA=1 \
npx playwright test \
  e2e/production-qa-files.spec.ts \
  e2e/production-qa-calendar.spec.ts \
  e2e/production-qa-invoice-payment-report.spec.ts \
  --project=chromium --workers=1 --retries=0
```

Result:

```text
3 passed (37.5s)
```

Calendar evidence included booking `?success=1`, exact title visible internally, ICS HTTP 200, `text/calendar`, attachment disposition, `BEGIN:VCALENDAR`, and UI cancellation.

## Full quality gates

```text
Vitest:     405 files passed
Tests:      1,817 passed
ESLint:     PASS
TypeScript: PASS
Next build: PASS
```

## Cleanup proof

Read-only DB postconditions after final run:

```text
QA global files:                              0
QA active appointments:                      0
QA draft invoices without payments:          0
Current-campaign payment invoices not void:  0
```

Partial-payment invoices created during failed attempts were voided through supported UI. Payment rows and line items remain for audit. One older cross-scope accounting fixture (`b7a0e10c-216d-4a39-b0f3-bcf1156f4a26`) remains untouched because current workspace UI cannot access it; it predates this campaign and is not counted as disposable current-campaign residue.

## Deployment incident and recovery

A Docker rename attempt hit Swarm endpoint-table DNS conflict and briefly caused public HTTP 502. Recovery removed and recreated only `cubiqlo-new-app-next` from backed-up runtime env and exact image. PostgreSQL, Redis, and Traefik were not restarted. Final local/public health passed; app has no host port bindings; `dokploy-traefik` remains sole 80/443 owner.

## Relevant commits

```text
66abf6a fix: render global files from fresh DB state
111868b fix: show uploaded files at workspace root
cad9a8b test: complete files calendar and reports production gates
```
