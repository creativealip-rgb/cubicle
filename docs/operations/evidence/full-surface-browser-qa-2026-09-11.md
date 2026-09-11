# Full-Surface Browser QA — 2026-09-11

## Scope

Target: `https://app.cubiqlo.com`
Account: `testing@cubiqlo.com`
Workspace: `Cubiqlo Studio`
Method: Playwright browser mutations; DB read-only verification only.

## Auth

- Signup disposable account: PASS.
- DB email verification: PASS.
- Existing testing account session: PASS; `/api/auth/get-session` returned HTTP 200.

## Executed suites

- `production-qa-client-project.spec.ts`: PASS.
- `production-qa-task.spec.ts`: PASS.
- `production-qa-documents.spec.ts`: PASS.
- `production-qa-calendar.spec.ts`: 5 PASS, 1 PARTIAL.
- `production-qa-expense.spec.ts`: PASS.
- `production-qa-portal.spec.ts`: PASS.
- `production-qa-invoice-payment-report.spec.ts`: PASS.
- `production-qa-files.spec.ts`: PARTIAL; upload/persistence passed, download selector drift failed.
- `production-qa-time.spec.ts`: BLOCKED; stale bilingual selector and client refresh behavior prevented time mutation.
- Fixed/retainer/project billing suites: BLOCKED by create-client refresh/assertion failure after UI submit; no invoice conclusion.

## Feature matrix

1. Dashboard — PASS via authenticated navigation.
2. Client create/edit — PASS existing client/project suite; fresh time fixture blocked on post-create refresh.
3. Fixed/hourly/retainer projects/edit — PARTIAL; existing project suite PASS, fresh billing fixtures blocked.
4. Task create/edit — PASS.
5. File upload/delete — PARTIAL; upload persisted, download selector needs refresh.
6. Hourly/retainer time log — NOT PROVEN; time fixture blocked before log creation.
7. Invoices — PARTIAL; existing payment/report suite PASS; fresh model invoice suites blocked.
8. Service — NOT RUN; no matching production spec exists.
9. Proposal create/edit/send — PASS through production documents suite; email delivery not independently verified.
10. Contract create/edit/send — PASS through production documents suite; email delivery not independently verified.
11. Landing page — NOT RUN; no matching production spec exists.
12. Form create/edit — NOT RUN; no matching production spec exists.
13. Recurring invoice — NOT RUN; no matching production spec exists.
14. Expenses/categories — PASS through expense suite.
15. Reports — PASS through invoice/payment report suite.
16. Notes CRUD/archive — NOT RUN; no matching production spec exists.
17. Productivity goal/habit CRUD — NOT RUN; no matching production spec exists.
18. Planning 50/30/20 CRUD/report — NOT RUN; no matching production spec exists.
19. Journal CRUD/archive — NOT RUN; no matching production spec exists.
20. Prompt Studio — NOT RUN; no matching production spec exists.

## DB read-only snapshot

Before cleanup, exact QA-like counts were observed:

- QA-like clients: 57
- QA-like projects: 21
- QA-like tasks: 15
- QA-like files: 4

These include historical fixtures, not only this run. No DB delete/update was executed for cleanup.

## Status

Overall: `PARTIAL`.

No production code changed during this QA run. Temporary local runner edits were reverted. Existing unrelated untracked workspace files were preserved.

## Blockers

- Files download test uses stale action locator after grid menu redesign.
- Time and billing fixtures assume Indonesian labels and immediate client-list refresh; production UI currently renders English labels and does not expose the new client immediately in that assertion path.
- Services, landing page, forms, recurring invoices, Notes, Productivity, Planning, Journal, and Prompt Studio lack matching runnable production specs; therefore they are `NOT RUN`, not PASS.
- Cleanup remains pending because the request requires UI-only deletion and exact fixture ownership; DB counts show historical QA data and must not be mass-deleted.

## Verification

Runtime health before QA: `status=ok`, `db=ok`.
Public proxy guard: only `dokploy-traefik` owns ports 80/443.
Secrets: no credentials written into this evidence file.
