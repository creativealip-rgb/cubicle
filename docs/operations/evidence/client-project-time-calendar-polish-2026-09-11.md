# Client, Project, Time, and Calendar Polish — 2026-09-11

## Release

- Repository: `/root/projects/cubicle`
- Branch: `main`
- Production commit/image: `d7b6fa3e8028194dddea95f3f3e1d46168c85111` / `cubiqlo-prod:sha-d7b6fa3e8028194dddea95f3f3e1d46168c85111`
- Runtime: `cubiqlo-new-app-next` on `dokploy-network`, no host port binding; public routing remains through `dokploy-traefik`.
- Production health after deploy: HTTP 200, `status=ok`, `db=ok`.

## Delivered changes

### Client detail and editing

- Added spacing between Address content and the Client Details divider.
- Revalidated client list/detail routes after successful updates so stale detail data is not retained.
- Prevented ordinary contact edits from resubmitting unchanged client-portal enablement state.
- Reworked Edit Client into a balanced desktop two-column layout:
  - Identity/contact on the left.
  - Internal notes, portal slug, tags, and address on the right.
  - Wider `max-w-4xl` dialog.
  - Create Client flow remains unchanged.
- Live browser proof at 1440×900: dialog `896×646px`, body `scrollHeight=567`, `clientHeight=567`, Save visible, no page overflow.
- Mobile browser proof at 390×844: safe internal scrolling, Save visible, no horizontal overflow.

### Project billing and task metrics

- Retainer Usage now uses live approved/invoiced billable time entries when period aggregates are absent.
- Preserved minute precision in compact quota display (`20m`, not rounded to `0h`).
- Hourly Invoice Progress target now equals billable duration multiplied by effective hourly rate, not one hour of rate.
- Kept Billing Settings hourly rate separate from invoice-progress target.
- Replaced misleading recurring-task completion percentage with `Active Recurring Tasks` count for Hourly/Retainer projects. Fixed/workflow projects retain completion progress.
- Project recurring task rows now include manual time in Hours This Month and expose Last Used.
- Live proof included: 20 tracked hours, three active recurring tasks, `20.0 hr` for linked task, `Rp 200.000/hr`, `Rp 4.000.000` billable amount, and invoice target based on total billable work.

### Weekly timesheet

- Empty and populated desktop grids now share one 10-column contract:
  - Project: 280px minimum.
  - Task: 220px minimum.
  - Seven day columns: 72px minimum each.
  - Total: 80px.
  - Grid minimum width: 1092px.
- Populated Project and Task remain separate columns.
- Header, rows, and Daily Total use the same track definition.
- Duration inputs use full-width/min-width-zero and tabular numerals so `HH:MM` and populated values cannot resize columns.
- Browser measurement before the final structural split confirmed populated and empty duration cells at 72px with zero document overflow; final source contract is locked by regression tests.

### Calendar

- Upcoming Appointments empty state now uses the shared `embedded` mode.
- Removed nested border/background card while retaining the outer appointments card and centered empty content.
- Live browser computed style: inner border width `0px`, transparent background, zero overflow.

## Commits

- `b9e9817` — correct project billing progress and client detail edits.
- `4f29d50` — track recurring task usage in project metrics.
- `991c728` — keep hourly rate separate from invoice target.
- `eb7b7ec` — simplify recurring task project KPI.
- `0fbdaab` — keep weekly grid columns stable when filled.
- `3b0256e` — Edit Client balanced-dialog design.
- `ecd2ec1` — balance Edit Client dialog layout.
- `d7b6fa3` — flatten Calendar empty state.

## Verification

- Relevant Vitest regression suites passed after each change.
- ESLint passed after each committed code change.
- TypeScript passed for project/client/time changes.
- Production builds passed for each deployed image.
- Live browser checks covered project overview/tasks, weekly timesheet, Edit Client desktop/mobile, and Calendar empty state.
- Production health and DB checks returned OK after final deployment.

## Open policy gate

- MFA recovery final redemption remains pending mandatory 72-hour cooling and two distinct admin approvals. No policy bypass performed.

## Related design and plan

- `docs/superpowers/specs/2026-09-11-edit-client-balanced-dialog-design.md`
- `docs/plans/2026-09-11-edit-client-balanced-dialog.md`
- `docs/operations/evidence/platform-convergence-2026-09-10.md`

## Manual QA checklist

1. Edit a client contact field and confirm detail page immediately reflects saved value.
2. Open Edit Client at desktop width and confirm every field plus Save is visible without scrolling.
3. Open Edit Client at 390px and confirm one-column scroll reaches Save without horizontal overflow.
4. Check Hourly project rate, billable amount, invoice target, and active recurring-task count.
5. Check Retainer usage after adding approved billable time.
6. Compare empty and populated Weekly timesheet column boundaries.
7. Check Calendar with zero upcoming appointments and confirm only one card shell is visible.
