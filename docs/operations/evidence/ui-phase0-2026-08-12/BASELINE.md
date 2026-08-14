# Cubiqlo UI Phase 0 Baseline

**Tanggal:** 12 Agustus 2026  
**Source repo:** `/root/projects/cubicle`  
**Source revision:** `main@44a9c32ef58b03f8f83b4d32f63dbf1544b03b0d`  
**Dev integration revision:** `b211a50b74ce08a077d8c9a7b37785cf09bc8813`  
**Dev runtime image:** `cubicle-dev:prod` / `sha256:dc1f4d82fcd046fbd77509553dbfdd98711917945ff7a647f750a07b38ebcde8`  
**Runtime:** healthy, `restart=unless-stopped`, restart count `0`  
**Audit account:** dedicated existing owner account; identifier redacted and credential not stored in artifact  
**Audit mode:** source read-only + authenticated runtime capture; production untouched

## Verdict

**Phase 0 passed with constraints. Batch A global foundation ready.**

Constraints:

- Do not change DB/schema, billing semantics, task billing mode, invoice calculation, or public lifecycle.
- Do not implement calendar scheduling grid, inline file preview, Docs search, or Docs read-state in UI-polish batch.
- Do not edit `dev/integration` directly. Feature branch first, integration owner deploys.
- Re-run source overlap check immediately before Batch A because active branches can move.

## Repository and Runtime Baseline

- `main` clean except untracked `plan-ui-improvement.md` at audit start.
- Authenticated source inventory: **56 routes** under `src/app/(app)`.
- `dev.cubiqlo.com/api/health`: `200`.
- `dev.cubiqlo.com/login`: `200`.
- `cubiqlo.com`: `200`; only availability checked, no production mutation.
- Environment keys confirm isolated dev URL/DB/storage/payment/email configuration exists. Secret values were not printed or stored.
- Active worktrees observed:
  - `dev/integration`
  - `feat/invoice-source-revision`
  - `feat/prompt-studio-ux-data`
- Remote `feat/billing-aware-phase1` existed but had no `origin/main...branch` changed-file delta at capture time. ACTIVE_BOARD still marks billing-aware schema work active; treat task/time/invoice domain files as collision-prone.

## Runtime Capture

Routes:

- `/app/dashboard`
- `/app/reports`
- `/app/projects`
- `/app/time`
- `/app/invoices`
- `/app/calendar`
- `/app/files`
- `/app/tasks`
- `/app/settings`
- `/app/personal`
- `/app/docs`
- `/app/whats-new`

Viewports:

- Desktop `1440×900`
- Tablet `1024×768`
- Mobile `390×844`
- Short mobile `390×667`

Result:

- **48 captures** generated.
- **47 initial responses 200**.
- `/app/projects` mobile returned one transient `502`; immediate retry returned `200`; container remained healthy with restart count `0`. Classify as transient dev/runtime pressure, not confirmed page bug.
- One confirmed overflow: `/app/personal` tablet, document `1069px`, viewport `1024px`.
- Screenshots and machine output: this directory, `*.png` and `runtime.json`.
- Canonical per-route evidence manifest: `MANIFEST.md`.
- Browser session storage was deleted after capture.

State coverage limitation:

- Captures reflect current populated/account-visible runtime state.
- Empty/loading/error/permission states were not safely forced during read-only baseline. Mark them `Not exercised`; Batch A/page batches must cover applicable states through fixtures or existing deterministic routes.
- Long-content coverage is partial and must be added where a changed layout can wrap or clip.

## Base Color and Contrast

Computed runtime tokens match source `src/app/globals.css`:

| Token | Value | Use |
|---|---|---|
| Primary | `#6647F0` | CTA, selected state, focus ring |
| Primary hover | `#5333DD` | hover |
| Primary active | `#4A2AD0` | active |
| Foreground/navy | `#292D34` | headings, body foreground |
| Muted foreground | `#646464` | helper/meta text |
| Orange | `#ED5F00` | urgency/destructive accent |
| Border | `#E8E8E8` | subtle separation |
| Input border | `#D9D9D9` | controls |
| Background/card | `#FFFFFF` | main surfaces |
| Sidebar/secondary | `#F8F9FA` | secondary surface |

Contrast evidence:

| Pair | Ratio | Decision |
|---|---:|---|
| `#292D34` / white | `13.82:1` | AA/AAA text |
| `#646464` / white | `5.92:1` | AA body/helper text |
| white / `#6647F0` | `5.64:1` | AA text CTA |
| white / `#ED5F00` | `3.37:1` | large text/UI only; not small body text |
| `#292D34` / `#F8F9FA` | `13.11:1` | AA/AAA |
| `#E8E8E8` / white | `1.23:1` | decoration only; not sole UI boundary/focus signal |

Decision: base colors already exist and are production-shaped. Batch A reuses them; no palette invention.

## Navigation and Role Baseline

Canonical registry: `src/lib/navigation/app-navigation.ts`.

Groups:

- direct dashboard
- work: clients, projects, tasks
- direct time
- business: services, proposals, contracts, questionnaires
- direct calendar
- direct files
- finance: invoices, expenses, reports
- personal: notes, journal, personal site
- AI: assistant, prompt studio

Role behavior:

- Personal group is owner-only.
- Files write behavior is owner/member; viewer is read-only.
- Other visible navigation is broadly available to workspace roles subject to page/action permission checks.
- Billing, email, support, search, templates, and some settings entry points are outside sidebar registry and require regression through topbar/direct routes.

Confirmed active-navigation issue:

- Leaf item uses `aria-current="page"` in `src/components/sidebar/sidebar-navigation.tsx`.
- Parent group also uses `aria-current="true"` when child is active.
- Runtime DOM often reports duplicate current entries because desktop and mobile navigation copies remain in DOM.

Batch A requirement:

- Only current leaf gets `aria-current="page"`.
- Parent exposes expansion with `aria-expanded`, not current-page semantics.
- Hidden desktop/mobile duplicate must not create duplicate accessibility-current state.

## Shared Primitive Impact Matrix

Caller counts are source grep estimates and must be refreshed before edit.

| Primitive | Source | Approx. callers | Impact |
|---|---|---:|---|
| Button | `src/components/ui/button.tsx` | 172 | Global; highest regression risk |
| Card | `src/components/ui/card.tsx` | 67 | Dashboard, Reports, Calendar, Files, Tasks, many forms |
| Input | `src/components/ui/input.tsx` | 75 | Forms/search |
| Badge | `src/components/ui/badge.tsx` | 59 | Status/reminders |
| Dialog | `src/components/ui/dialog.tsx` | 56 | Forms, delete, confirmations |
| Select | `src/components/ui/select.tsx` | 40 | Filters/forms |
| PageHeader | `src/components/ui/page-header.tsx` + `.app-page-*` | 17 | Page grammar |
| Table | `src/components/ui/table.tsx` | 10 | Reports/tasks/contracts/proposals |
| Tabs | `src/components/ui/tabs.tsx` | 7 | Feature tabs |
| StatusFilterTabs | `src/components/ui/status-filter-tabs.tsx` | several | Reports/invoices status navigation |
| Sidebar navigation | `src/components/sidebar/sidebar-navigation.tsx` | app-wide | Active state, roles, desktop/mobile |
| Empty state | inline patterns | repeated | No shared primitive exists yet |

Implementation ceiling:

- Avoid broad Card/Button visual rewrite unless regression capture covers all mandatory routes.
- Prefer sidebar semantics, shared page grammar, tab consistency, contrast, and narrow fixes first.
- A shared EmptyState component is allowed only if replacing proven repeated markup without behavior changes; otherwise standardize classes locally in first batch.

## Capability and Data-source Matrix

| Target | Existing source/capability | Decision |
|---|---|---|
| Dashboard counts KPI | Existing per-workspace server queries in `dashboard/page.tsx` | `RESTYLE_EXISTING` |
| Dashboard onboarding | `DashboardOnboarding` + existing derived booleans | `RESTYLE_EXISTING` |
| Dashboard reminders | Existing `attention` query + reminder array | `RECOMPOSE_EXISTING_DATA` |
| Dashboard 30-day revenue | Existing payment/invoice query + SVG sparkline | `RESTYLE_EXISTING` |
| Dashboard revenue by client | Existing query/list bars | `RECOMPOSE_EXISTING_DATA` |
| Reports KPI/delta | Existing payment/expense period queries | `RESTYLE_EXISTING` |
| Reports income-vs-expense chart | Existing `IncomeExpenseChart` + report period grouping | `RESTYLE_EXISTING` |
| Reports top clients/categories | Existing maps | `RESTYLE_EXISTING` |
| Reports aging/time performance/export | Existing table, reporting helper, XLSX route | `RESTYLE_EXISTING` |
| Reports featured net income | Existing canonical `income - expense` value | `RESTYLE_EXISTING` |
| Calendar date picker | Existing `react-day-picker` component | `RESTYLE_EXISTING` |
| Calendar scheduling grid | No scheduling-grid capability | `DEFER_PRODUCT_WORK` |
| Availability rules/upcoming appointments | Existing queries/forms/lists | `RESTYLE_EXISTING` |
| Files list/tree/filter/download | Existing components/actions | `RESTYLE_EXISTING` |
| Files storage meter | Existing quota and byte aggregation | `RESTYLE_EXISTING` |
| Inline file preview | No inline preview; current flow opens signed download URL | `DEFER_PRODUCT_WORK` |
| Tasks list/filter/pagination | Existing | `RESTYLE_EXISTING` |
| Global tasks board | Existing static four-column board | `RESTYLE_EXISTING` |
| Global board drag/drop | DnD exists only in project detail | `DEFER_PRODUCT_WORK` for this polish batch |
| Project-detail kanban | Existing `KanbanBoard` + reorder action | `RESTYLE_EXISTING` |
| Docs hub/detail | Existing hardcoded guide content and shell | `RESTYLE_EXISTING` |
| Docs search | No docs index/query | `DEFER_PRODUCT_WORK` |
| Docs read-state/progress | No persisted state | `DEFER_PRODUCT_WORK` |

## Mandatory Regression Set for Batch A

At minimum:

- All 12 redesign routes.
- `/app/clients`
- `/app/projects/[projectId]`
- `/app/invoices/new`
- `/app/invoices/[invoiceId]`
- `/app/expenses`
- `/app/proposals`
- `/app/contracts`
- `/app/questionnaires`
- `/app/billing`
- `/app/email`
- `/app/templates`
- `/app/search`
- `/app/support`

When primitive scope expands, add every caller category touched: auth/public portal smoke for shared Button/Input/Dialog changes.

## Batch A Approved Scope

1. Fix sidebar current/expanded semantics.
2. Verify/fix sidebar short-height reachability without changing menu IA.
3. Fix `/app/personal` tablet overflow.
4. Standardize tab selected/focus state using existing tokens.
5. Standardize page-header grammar where existing component/class already applies.
6. Improve low-contrast helper/empty copy only where measured or visibly below token contract.
7. Reduce nested borders through existing semantic tokens; no broad Card rewrite first.
8. Audit changed strings/formatters in ID and EN.

## Batch A Explicitly Blocked

- Page-specific Dashboard/Reports redesign before global foundation verifies clean.
- Route/sidebar IA restructuring.
- Billing-aware task/time/project semantics.
- New chart library.
- New calendar grid.
- Inline file preview.
- Docs search/read tracking.
- Global tasks drag/drop expansion.
- Production deployment.

## Phase 0 Acceptance

- [x] Repo/runtime revision recorded.
- [x] Dev health and isolation shape checked without printing secrets.
- [x] Authenticated captures completed at four viewports.
- [x] Base tokens and contrast measured.
- [x] Authenticated route inventory completed.
- [x] Navigation/role behavior inventoried.
- [x] Shared primitive impact matrix completed.
- [x] Capability/data-source matrix completed.
- [x] Active branch collision risk documented.
- [x] Batch A scope and blockers decided.

## Quality-gate Baseline

- Phase 0 did not rerun `npm run lint`, `npx tsc --noEmit`, `npm test`, or `npm run build`; capture was intentionally source read-only + authenticated runtime only.
- Status: `Not run in Phase 0`, not assumed passing.
- Batch A requires all four gates from its clean feature worktree before handoff.
- Runtime evidence remains independent: 48 captures, 47 initial `200`, one transient `502` with immediate successful retry, one confirmed tablet overflow, and no confirmed container restart.

## Post-capture Worktree Warning

- At follow-up, main worktree contained parallel tracked edits in billing/team files plus untracked Phase 0 artifacts.
- `dev/integration` also contained broad parallel tracked/untracked work, including schema, Time, Reports, Settings, shared components, tests, and migrations.
- These changes occurred outside the read-only Phase 0 artifact scope and are not approved as Batch A input.
- Do not stash, reset, commit, branch from, or deploy either dirty worktree until its owner identifies and preserves the active lane.
- Batch A starts only from a clean integration-owner-approved revision after fresh overlap inspection.

**Decision:** proceed to Batch A on a feature branch. Deploy shared dev only after combined gates and integration-owner handoff.
