# E2E User Kosong: Client sampai Invoice — 2026-07-30

## Scope

- Target: `https://dev.cubiqlo.com`
- Environment: isolated `cubicle_dev` database
- Method: authenticated Playwright browser flow; entity creation used real UI forms, not direct entity seeding
- Viewports: desktop `1440×1000` and mobile `390×844`
- Production remained unchanged

## Isolated QA account

- User: `e2e-empty-1785408706295@cubiqlo.test`
- Workspace: `E2E Empty User's Workspace`
- Initial dashboard proof: onboarding `0/7`, projects `0`, tasks `0`, invoice due `0`, and 30-day income `Rp 0`
- Development email verification used the verification URL emitted by the dev notification logger

## Browser flow

1. Sign up a new account.
2. Verify email and log in.
3. Create client `E2E Client Kosong` / `PT E2E Alur Lengkap`.
4. Reload and verify client persistence.
5. Create project `E2E Project Alur Lengkap` as Fixed Price IDR 15,000,000.
6. Reload and verify project/client relationship.
7. Create task `E2E Task Invoice Flow`.
8. Reload and verify task/project relationship.
9. Change project billing from Fixed Price to Hourly at IDR 250,000/hour.
10. Create a 120-minute manual entry `E2E 2 jam implementasi invoice` for the project/task.
11. Reload and verify the manual entry renders on `/app/time`.
12. Create draft invoice `INV-0001` with line item `Implementasi E2E 2 jam`, quantity 2, unit price IDR 250,000.
13. Reload invoice detail and verify total IDR 500,000 and line-item persistence.
14. Revisit dashboard, clients, projects, tasks, time, and invoice detail on desktop/mobile.

## Bugs discovered and fixed

### 1. Project billing transition returned HTTP 500

**Reproduction:** edit a Fixed Price project, choose Hourly, leave optional dates empty, save.

**Root cause:** `updateProject` wrote `dueDate: ""` directly into PostgreSQL `date`, causing `22007 invalid input syntax for type date`. The billing transition also left `timeTrackingMode=off`, so an Hourly project would remain absent from Time selectors.

**Fix:**

- normalize empty optional due date to `NULL`;
- set canonical tracking mode when billing model changes: Fixed Price → `off`, Hourly/Retainer → `billable`, unless explicitly supplied;
- add RED → GREEN regression coverage.

**Commit:** `ee69b6d` — `fix: normalize project billing transitions`

### 2. Manual duration entry saved but stayed invisible

**Reproduction:** create a manual duration entry; toast says `Waktu tercatat`, DB row exists, but daily Time still shows the empty state after reload.

**Root cause:** Time route query required `end_time IS NOT NULL`. Duration-only manual entries intentionally store `start_time=NULL`, `end_time=NULL`, and `manual_minutes>0`, so valid rows were always filtered out.

**Fix:**

- include entries where either `end_time` or `manual_minutes` is non-null;
- associate Project, Task, Description, Date, Hours, and Minutes labels with controls in `Catat Waktu`;
- add RED → GREEN regression coverage.

**Commit:** `3a543a0` — `fix: show manual time entries in history`

## Final data proof

| Entity | Count | Marker |
|---|---:|---|
| Client | 1 | `E2E Client Kosong` |
| Project | 1 | `E2E Project Alur Lengkap` |
| Task | 1 | `E2E Task Invoice Flow` |
| Time entry | 1 | `E2E 2 jam implementasi invoice`, 120 minutes |
| Invoice | 1 | `INV-0001`, draft, IDR 500,000 |

Invoice item proof:

- description: `Implementasi E2E 2 jam`
- quantity: `2.00`
- unit price: `250000.00`
- amount: `500000.00`

## Final verification

- Desktop and mobile target routes returned HTTP 200.
- Client, project, task, manual time entry, and invoice markers rendered after reload.
- Page-level horizontal overflow: 0.
- Visible error boundaries: 0.
- Browser console errors: 0.
- Recent runtime errors after final retest: 0.
- Vitest: 126/126 files, 547/547 tests.
- ESLint: 0 errors; one pre-existing `timer-widget.tsx` hook dependency warning.
- Next.js production build: pass.
- Dev runtime revision: `3a543a08ce56e4d4c7c6bc0fafb2f1d1515a1a9b`.
- Runtime: healthy, restart count 0, app/DB health `ok`.
- Public 80/443 owner: `dokploy-traefik` only.
- Production application/container: unchanged.

## Fixture policy

The account and five related entities remain in the isolated dev workspace for repeatable regression testing. They do not affect existing QA accounts or production data.
