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
- Task desktop/mobile cases checked horizontal overflow and browser console/page errors: passed.
- Client/Portal case checked control reachability only; dedicated overflow/browser-error assertions remain in full Task 19 matrix.
- Expanded origins/formatting/Template/Portal run: 5 passed in 24.8 seconds.
- Verified 12-row fixture paginates 10/2 across page 1/2; mixed workflow/reusable rows render; Template route renders template/item/import controls.
- Client-scoped Project creation persisted, stayed on `?tab=projects`, and hid Client selector.
- Project-scoped Invoice creation persisted, increased Project Invoice count from 1 to 2, stayed on Project detail, and hid Client selector.
- Portal owner lifecycle passed: set password, masked default, reveal plaintext on demand, copy control, then hide again.
- Task Template create/edit/duplicate/archive/restore passed; item create/edit/remove and DB-confirmed one-step reorder passed; archived write controls disappeared.
- Import negative guard passed: zero Template selection disables Preview and zero selected preview items disables Import.
- Template server actions persist correctly, but reorder/duplicate/archive/restore need explicit reload before UI reflects DB state; this refresh lag remains a UX follow-up.
- Invoice Back destinations passed for validated Project, Client, global, and malformed-origin fallback. Invoice status rendered `Draf`, amount rendered `Rp 1.500.000`, and raw `draft` was absent from visible body copy.
- Fresh post-success server log window found no app query/error markers. One expected pre-fix plan-entitlement denial was retained in older iterative logs. Temporary QA workspaces were cascade-deleted after each run; remaining fixture count is zero; QA user plan restored to Free.

## Browser QA still required

This expanded smoke still does not complete the full Task 19 mutation matrix. Still required before final handoff: Portal legacy hash-only and unauthorized reveal denial; mixed-mode Task edit persistence and List/Board mutation behavior; stale-preview import rejection.

## Runtime defect found and fixed

Initial browser run exposed PostgreSQL error `42809: WITHIN GROUP is required for ordered-set aggregate mode` while loading the Task page with pagination query `count(*)::int`. Pagination now counts the canonical primary key with `count(${tasks.id})::int`; source-contract test rejects reintroducing `count(*)::int`. Fresh production-shape runtime and browser smoke passed afterward. Initial failure log remains `/tmp/cubiqlo-client-task-revision-final/playwright.log`; fresh bounded logs include build and smoke output.

## Release state

- Implemented and tested on feature branch.
- Shared `dev/integration`: not integrated.
- `cubicle_dev`: not migrated by feature agent.
- `dev.cubiqlo.com`: not deployed by feature agent.
- Production: untouched; explicit approval still required.
