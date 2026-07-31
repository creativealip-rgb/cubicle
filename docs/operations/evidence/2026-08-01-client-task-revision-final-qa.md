# Client, Invoice, Portal, and Task Revision Final QA

Date: 2026-08-01
Branch: `feat/client-project-invoice-task-revision`
Baseline feature tip: `ffa77cffd4d8e01fbd404ee6e94ef2baab3429e9`
Environment: isolated PostgreSQL database and isolated QA app on loopback port `3201`; shared dev and production untouched.

## Automated gates

- ESLint: exit 0.
- TypeScript (`npx tsc --noEmit`): exit 0.
- Vitest: 181 files passed, 758 tests passed.
- Targeted PostgreSQL/Portal verification: 3 files passed, 7 tests passed.
- Production-shape Docker build: exit 0; QA image `sha256:9d3990b624a116570700022647a8990133fb49c522b002e5670e5fca4dbe28cc`.
- `git diff --check`: exit 0.

Full bounded logs: `/tmp/cubiqlo-client-task-revision-final/fresh/`.

## Migration rehearsal

- Applied `0064_billing_aware_task_templates.sql` to isolated QA database before runtime checks.
- Applied `0065_portal_password_ciphertext.sql` to same isolated QA database.
- Verified Task `mode`/`lifecycle` and all Portal ciphertext columns exist.
- Production database was not touched.

## Browser smoke completed

Playwright `e2e/client-task-revision.spec.ts`, Chromium, retries disabled:

- Desktop 1440×1000 Task page/navigation/template rendering: passed.
- Mobile 390×844 Task page/navigation/template rendering: passed.
- Client Project and Portal control reachability: passed.
- Horizontal overflow and browser console/page errors checked by suite: passed.
- Result: 3 passed in 6.4 seconds.

## Browser QA still required

This smoke does not complete the full Task 19 matrix. Still required before handoff: scoped Project creation persistence; scoped Invoice creation and all Back origins; Portal no-password/legacy/reveal/change/unauthorized flows; mixed-mode Task edits and List/Board; two-page pagination with preserved filters; Template and item mutations/reorder/import negative cases; localized Invoice formatting; fixture/ciphertext cleanup and fresh server-log check.

## Runtime defect found and fixed

Initial browser run exposed PostgreSQL error `42809: WITHIN GROUP is required for ordered-set aggregate mode` from pagination query `count(*)::int`. The generated SQL was parsed incorrectly in this runtime. Pagination now counts the canonical primary key with `count(${tasks.id})::int`; regression test rejects `count(*)::int`. Fresh runtime/browser QA passed afterward.

## Release state

- Implemented and tested on feature branch.
- Shared `dev/integration`: not integrated.
- `cubicle_dev`: not migrated by feature agent.
- `dev.cubiqlo.com`: not deployed by feature agent.
- Production: untouched; explicit approval still required.
