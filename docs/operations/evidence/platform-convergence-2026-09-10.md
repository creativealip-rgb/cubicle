# Cubiqlo Platform Convergence — 2026-09-10

## Release

- Production SHA/image: `57fbf4d11289a6d55035eec0c249c31b813d10ca`
- Runtime: `cubiqlo-new-app-next`, internal port only, `dokploy-network`
- Public proxy: `dokploy-traefik` only on ports 80/443
- Health: application and PostgreSQL `ok`

## Changes

- Rechecked 102-route inventory at desktop 1440px and mobile 390px: 204 render checks, no confirmed overflow or application 5xx.
- Validated tenant-scoped dynamic routes with active-workspace fixtures.
- Added malformed UUID guard to Personal Goal detail routes.
- Fixed public Intake activity logging by keeping anonymous actor ID null.
- Fixed Better Auth admin-created/reset credentials to use `issuer = local:credential`.
- Added unique IDs to responsive Client row actions.
- Standardized row action menus across Clients, Projects, Activities, Templates, Task Templates, Expenses, Packages, and Services.
- Fixed dialog focus restoration, form pending semantics, and unsaved-editor navigation guards.
- Added accessible names for Files and Support search fields and file action controls.
- Removed nested Personal Site main landmark.
- Changed Personal Site Publish/Unpublish to await server persistence before showing final `Live`/`Draft` state.
- Rebuilt Files as compact Google Drive-style cards: three desktop columns, one mobile column, 56px rows, accessible action menus, folder-first unified collection, 15 items per page.
- Preserved file Download, visibility, deliverable/working-file, and Delete mutations in compact action menus.

## Production behavior evidence

- Core Playwright flows passed for Client, Project, Task, Time, Invoice, Payment, Expense, Proposal, Contract, Client Portal, Files, Calendar, Reports, and Fixed/Hourly/Retainer billing.
- Reset-password lifecycle passed: valid reset, new password accepted, old password rejected, token replay rejected, original QA password restored.
- Personal Site disposable lifecycle passed: signup, workspace, publish, DB `published=true`, public HTTP 200, unpublish, DB `published=false`, public HTTP 404, cleanup.
- Live AI matrix passed: malformed request HTTP 400, conversation creation HTTP 200, chat stream HTTP 200 with output, conversation cleanup.
- Rate-limit/entitlement suite passed: 47/47 tests.
- Accessibility sweep covered 15 primary routes at desktop/mobile with zero overflow and duplicate IDs; search controls, focus, skip link, heading, and landmark defects were fixed and retested.

## Final verification

Two consecutive fresh runs on `57fbf4d`:

- 424/424 Vitest files passed.
- 1,854/1,854 tests passed.
- ESLint passed.
- TypeScript passed.
- Next.js production build passed.

Fixture cleanup:

- QA Portal clients: 0
- QA expenses: 0
- QA Personal Site users/workspaces: 0
- QA recovery requests: 0
- QA global files: 0

## Open policy-gated item

Final MFA recovery redemption remains waiting on mandatory 72-hour cooling and two distinct admin approvals. Request creation, pending state, cooling enforcement, and admin availability were verified. The policy was not bypassed.

## Evidence files

- `docs/operations/evidence/coverage-recheck-2026-09-10/ledger.json`
- `docs/operations/evidence/coverage-recheck-2026-09-10/route-sweep.json`
- `docs/operations/evidence/coverage-recheck-2026-09-10/scoped-routes.json`
- `docs/operations/evidence/coverage-recheck-2026-09-10/scoped-routes-valid.json`
- `docs/operations/evidence/coverage-recheck-2026-09-10/a11y/results.json`
- `docs/operations/evidence/coverage-recheck-2026-09-10/files-compact/`
- `docs/operations/evidence/files-15-compact-live.png`
