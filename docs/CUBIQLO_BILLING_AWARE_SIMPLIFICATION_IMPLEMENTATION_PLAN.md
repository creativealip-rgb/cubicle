# Cubiqlo Billing-Aware Simplification — Executable Implementation Plan

**Status:** Approved product direction; implementation-ready after Phase 0 profiling gate
**Owner:** Alip
**Prepared:** 28 July 2026
**Baseline:** `dev/integration` at `74b265fa789fca39476dbb6dcec78cd86c37301c`
**Production gate:** No production deploy or production DB migration without explicit Alip approval
**Canonical repo path:** `docs/CUBIQLO_BILLING_AWARE_SIMPLIFICATION_IMPLEMENTATION_PLAN.md`

## 0. Source of Truth and Conflict Resolution

This document supersedes:

- `docs/PROJECT_SERVICE_ACTIVITY_TIME_PLAN.md`
- `/root/.hermes/shared-workspace/handoff/CUBIQLO_SIMPLE_BILLING_AWARE_WORKFLOW_PLAN.md` where conflicting
- Earlier decisions using `Timer | Timesheet | Riwayat`
- Earlier decisions using Task-first global search

Final locked Waktu architecture:

```text
Page       → history-first
Views      → Harian | Mingguan
Actions    → Catat Waktu | Mulai Timer
Input      → Project → Task → Description
Approval   → contextual action in Mingguan
```

There are no `Timer | Timesheet | Riwayat` tabs in final UX.

---

## 1. Product Invariants

Cubiqlo follows how client pays:

```text
Harga Tetap → outcome and completion
Per Jam     → approved work time
Retainer    → approved capacity usage per period
```

Core model:

```text
Client
└── Project
    ├── Task
    ├── File
    ├── Expense
    └── Invoice
```

Time applies only to Hourly and Retainer:

```text
Project → Task → Work Description → Time Entry
```

Removed from active product UX:

- Package
- Activity
- Service catalog
- Fixed Price time tracking

Legacy data remains readable until classified and reconciled.

---

## 2. ADR-001 — Canonical Billing Model

### Decision

Add a new canonical Project field instead of reinterpreting legacy values in place:

```ts
billingModel: "fixed_price" | "hourly" | "retainer" | "legacy_package"
```

Keep legacy `projects.billingType` during compatibility window:

```ts
"project" | "hours" | "package"
```

Mapping:

```text
project → fixed_price
hours   → hourly
package → legacy_package until classified
```

No automatic `package → retainer` migration.

### Target schema

Migration `drizzle/0056_billing_model_compatibility.sql`:

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS billing_model text;

ALTER TABLE projects
  ADD CONSTRAINT projects_billing_model_check
  CHECK (billing_model IN ('fixed_price','hourly','retainer','legacy_package'));

UPDATE projects SET billing_model = CASE
  WHEN billing_type = 'project' THEN 'fixed_price'
  WHEN billing_type = 'hours' THEN 'hourly'
  WHEN billing_type = 'package' THEN 'legacy_package'
END
WHERE billing_model IS NULL;

CREATE INDEX IF NOT EXISTS projects_workspace_billing_model_idx
  ON projects(workspace_id, billing_model);
```

Do not make `billing_model NOT NULL` until classification completes.

### New domain helper

Create `src/lib/billing-model.ts`:

```ts
export type BillingModel =
  | "fixed_price"
  | "hourly"
  | "retainer"
  | "legacy_package";

export function allowsTimeTracking(model: BillingModel): boolean;
export function allowsTimeInvoice(model: BillingModel): boolean;
export function defaultTaskBehavior(model: BillingModel): "one_time" | "recurring";
export function billingModelLabel(model: BillingModel): string;
export function assertSupportedBillingModel(model: BillingModel): void;
```

Rules:

```text
fixed_price    → no time
hourly         → time allowed, hourly invoice
retainer       → time allowed, period usage
legacy_package → blocked from new mutation until classified
```

---

## 3. ADR-002 — Retainer Technical Model

### Decision

Retainer is a first-class billing model. It is not Package renamed.

Configuration lives on Project. Historical period values live in immutable period snapshots.

### Project configuration

Migration `drizzle/0057_retainer_configuration.sql` adds:

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS retainer_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS retainer_included_minutes integer,
  ADD COLUMN IF NOT EXISTS retainer_period_unit text,
  ADD COLUMN IF NOT EXISTS retainer_reset_day integer,
  ADD COLUMN IF NOT EXISTS retainer_overage_policy text,
  ADD COLUMN IF NOT EXISTS retainer_overage_rate numeric(12,2);

ALTER TABLE projects
  ADD CONSTRAINT projects_retainer_period_unit_check
  CHECK (retainer_period_unit IS NULL OR retainer_period_unit = 'month'),
  ADD CONSTRAINT projects_retainer_reset_day_check
  CHECK (retainer_reset_day IS NULL OR retainer_reset_day BETWEEN 1 AND 28),
  ADD CONSTRAINT projects_retainer_overage_policy_check
  CHECK (retainer_overage_policy IS NULL OR retainer_overage_policy IN ('none','warn','bill'));
```

V1 decisions:

- Period unit: monthly only.
- Period boundary: calendar month anchored by `retainerResetDay` 1–28.
- Timezone: workspace timezone; fallback user timezone; final fallback UTC.
- Carry-over: none in V1.
- Proration: none in V1. New Retainer starts on configured next period; first period can be manually invoiced.
- Overage policies: `none`, `warn`, `bill`.
- Overage is calculated when period is locked.
- Configuration changes apply to next unopened period only.
- Existing/open period keeps snapshot values.
- Draft/submitted time is provisional usage.
- Approved/invoiced time is final usage.

### Period ledger

Migration `drizzle/0058_retainer_period_ledger.sql` creates:

```sql
CREATE TABLE retainer_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  timezone_snapshot text NOT NULL,
  fee_snapshot numeric(12,2) NOT NULL,
  currency_snapshot text NOT NULL,
  included_minutes_snapshot integer NOT NULL,
  overage_policy_snapshot text NOT NULL,
  overage_rate_snapshot numeric(12,2),
  approved_minutes integer NOT NULL DEFAULT 0,
  overage_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_generation integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  invoiced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, period_start, period_end),
  CHECK (status IN ('open','locked','invoiced'))
);
```

### Invoice idempotency

One period has at most one non-cancelled generated invoice at a time.

Add to invoices in `drizzle/0059_invoice_source_integrity.sql`:

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS billing_source text,
  ADD COLUMN IF NOT EXISTS billing_period_start date,
  ADD COLUMN IF NOT EXISTS billing_period_end date,
  ADD COLUMN IF NOT EXISTS retainer_period_id uuid REFERENCES retainer_periods(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_active_retainer_period_unique
  ON invoices(retainer_period_id)
  WHERE retainer_period_id IS NOT NULL AND status NOT IN ('cancelled');
```

Retainer invoice lines:

1. Base fee line from `fee_snapshot`.
2. Overage line only when policy is `bill` and overage > 0.
3. Expenses remain explicit invoice items; never automatically pulled into Retainer invoice in V1.
4. No proration line in V1.
5. Currency comes from period snapshot.

Cancellation/retry:

- Cancelling a draft/sent Retainer invoice sets period back to `locked`, clears `invoice_id`, increments `invoice_generation` on next generation.
- Paid invoice cannot be cancelled through this flow.
- Retry is transactional and uses unique period constraint.
- Same period cannot produce two active invoices.

Create:

- `src/lib/retainer-period.ts`
- `src/lib/actions/retainers.ts`
- `src/lib/invoice-retainer-policy.ts`

---

## 4. ADR-003 — Task Model

### Decision

Do not overload one status union. Keep current workflow status for one-time tasks and add explicit behavior/archive metadata.

Migration `drizzle/0060_task_behavior.sql`:

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS behavior text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_behavior_check
  CHECK (behavior IS NULL OR behavior IN ('one_time','recurring'));
```

Backfill:

```text
fixed_price    → one_time
hourly         → recurring
retainer       → recurring
legacy_package → NULL / blocked pending classification
```

Rules:

### Fixed Price

- `behavior = one_time`.
- Uses current workflow status normalized in UI:
  - `todo` → Belum Mulai
  - `in_progress` and `review` → Dikerjakan
  - `done` → Selesai
- Keep `review` internally during compatibility; milestone/client approval becomes separate later.

### Hourly/Retainer

- `behavior = recurring`.
- Available when `archivedAt IS NULL`.
- Archived when `archivedAt IS NOT NULL`.
- Do not use `done` as recurring lifecycle.
- Existing status remains compatibility metadata but is not rendered as Kanban workflow.

Billing model transition:

- New Project can choose any supported model.
- Billing model becomes immutable once Project has any time entry, invoice, milestone, retainer period, or accepted proposal snapshot.
- Empty Project may change model transactionally; Task behavior is re-derived.
- `legacy_package` cannot transition through normal form. It uses classification workflow.

Update:

- `src/lib/actions/projects.ts`
- `src/lib/actions/tasks.ts`
- `src/components/forms/project-form.tsx`
- `src/components/forms/task-form.tsx`
- `src/components/tasks/project-tasks-tab.tsx`

---

## 5. ADR-004 — Time Input and Required Fields

### Final decision

Both manual and timer use:

```text
Project → Task → Description
```

Reason: global Task search becomes too large and ambiguous across clients.

Rules:

### Manual entry

Required before save:

- Project
- Task
- Description
- Duration
- Work date

### Timer start

Required before start:

- Project
- Task

Description is optional at start but required before stop/finalization.

### Quick timer

- Remove empty quick-start from new Waktu UI and topbar.
- Topbar opens `Mulai Timer` dialog or navigates to `/app/time?action=timer`.
- Legacy active timers without Task remain completable through compatibility stop dialog.

### Legacy no-Task time

- Readable in internal history.
- Label: `Tanpa Task (legacy)`.
- Immutable if Fixed Price.
- For Hourly/Retainer legacy rows, owner may assign a Task before approval/invoice.
- Never client-visible or invoice-eligible until Task and Description exist.

### Description

- Required for manual entry.
- Required at stop.
- Required before approval and invoice.
- Client sees description only for approved/invoiced Hourly/Retainer records.

---

## 6. ADR-005 — Fixed Price Historical Time

Historical Fixed Price entries are:

- admin/owner readable;
- immutable;
- non-billable;
- excluded from new approval;
- excluded from invoice import;
- excluded from client portal;
- excluded from client-facing exports;
- excluded from active operational time reports;
- optionally available in an internal legacy audit export.

Forbidden mutations:

- edit description;
- change date/duration;
- reassign Project/Task;
- delete;
- approve;
- invoice;
- resume.

`canMutateHistoricalTimeEntry()` must check billing model, not only `timeTrackingMode`.

---

## 7. ADR-006 — Rate Precedence After Activity Removal

V1 does not add Task rate overrides.

New time rate precedence:

```text
existing entry snapshot
→ Retainer overage snapshot when generating overage invoice
→ Project hourly rate snapshot
→ workspace default hourly rate if Project rate missing
→ reject billable Hourly entry when no rate can be resolved
```

Activity rates and project-Activity overrides are legacy read-only inputs only.

Rules:

- New time write never calls `resolveActivityHourlyRate`.
- New entries snapshot resolved rate and currency.
- Changing Project/workspace rate never changes historical entry snapshots.
- Existing historical Activity rate remains visible only in internal legacy audit.

Update:

- `src/lib/actions/time.ts`
- `src/lib/time-entry-context.ts`
- `src/lib/project-time-tracking-policy-db.ts`

---

## 8. ADR-007 — Service Snapshot and Invoice Behavior

Service catalog UI is retired, but historical commercial snapshots remain.

### Existing projects

- Existing `projectServices` remain readable.
- Existing invoice/proposal lines keep original snapshots.
- Existing project service snapshots become immutable after cutover.
- No catalog-driven edits from Project form.

### New projects

- Do not create `projectServices` from Service catalog.
- Fixed Price invoice source:
  1. approved milestone amount when milestone selected;
  2. otherwise remaining agreed Project fixed amount/budget.
- Hourly invoice source: approved uninvoiced Hourly time.
- Retainer invoice source: period snapshot.

### Legacy invoice rendering

- Continue rendering existing Service/Package descriptions and amounts from snapshots.
- Never recalculate sent/paid historical invoices from current catalog data.

Do not drop `services`, `project_services`, or related snapshot columns until all proposal/invoice/portal/profitability read paths are cut over.

---

## 9. ADR-008 — Approval and Locking

Roles:

- Workspace owner can approve other users.
- Workspace admin can approve other users when writable permission exists.
- No user can approve their own submitted week.
- Owner/admin own entries are auto-approved at creation.
- Member entries begin draft.

Lifecycle:

```text
draft → submitted → approved
                  ↘ rejected → draft after explicit reopen
approved → invoiced
```

Rules:

- Rejected state remains.
- Submitted, approved, invoiced entries are locked.
- Rejection returns entries to draft transactionally.
- Approved entry modification requires explicit reversal by owner/admin, audit log, and must fail if invoiced.
- Invoice import locks source atomically.
- Week boundaries use workspace timezone.
- Entry belongs to week by effective work date:
  - manual: `workDate`;
  - timer: converted `startTime`.
- Retainer provisional usage: draft + submitted + approved.
- Retainer final usage: approved + invoiced.
- Client visibility: approved + invoiced only.

Approval remains contextual in Mingguan view. No permanent Approval tab.

---

## 10. Final Waktu UX

Final page:

```text
Waktu

[‹] [Selected date/period] [›] [Hari Ini]       [Harian | Mingguan]

[+ Catat Waktu] [Mulai Timer]

Total selected period
History rows
```

No:

- Timer card form permanently displayed;
- Timer/Timesheet/History tabs;
- Activity;
- KPI/filter/pagination block;
- Package/Service selectors.

### Daily

Row hierarchy:

```text
Project · Client
Task
Description
Duration
```

### Weekly

Desktop summary by Project+Task. Mobile sections by day.

Contextual approval:

- Member: `Kirim Minggu Ini`.
- Owner/admin: `Tinjau` pending submissions.

### Two dialogs

`Catat Waktu`:

```text
Project
Task
Description
Duration
Date
```

`Mulai Timer`:

```text
Project
Task
Description (optional at start)
```

Selectors contain only active, accessible Hourly/Retainer Projects and active recurring Tasks.

---

## 11. Phase 0A — Server Containment Before UX

This phase must ship before or in same commit as any UI hiding.

### Files

- `src/lib/billing-model.ts` — new.
- `src/lib/project-time-tracking-policy.ts`.
- `src/lib/project-time-tracking-policy-db.ts`.
- `src/lib/time-entry-context.ts`.
- `src/lib/actions/time.ts`.
- `src/lib/actions/invoices.ts`.
- `src/app/api/time/active/route.ts`.
- `src/lib/actions/timesheet-approval.ts`.

### Required guards

- `startTimer` rejects Fixed Price and `legacy_package`.
- `startTimerFromTask` rejects Fixed Price and `legacy_package`.
- `resumeTimer` rejects active timer attached to Fixed Price.
- `stopTimer` rejects reassignment to Fixed Price.
- `createManualEntry` rejects Fixed Price.
- `setWeeklyTimeCell` rejects Fixed Price.
- `updateTimeEntry` rejects Fixed Price and unsafe reassignment.
- `importTimeEntries` rejects Fixed Price/Retainer base-fee misuse.
- `/api/time/active` excludes Fixed Price from options.
- Approval excludes Fixed Price and uses effective work date.

### Failing tests first

Create:

- `src/lib/billing-model.test.ts`.
- `src/lib/fixed-price-time-negative-wiring.test.ts`.
- `src/lib/time-entry-context.test.ts`.
- `src/lib/invoice-source-integrity.test.ts`.

### Verification

```bash
npm test -- src/lib/billing-model.test.ts \
  src/lib/project-time-tracking-policy.test.ts \
  src/lib/time-entry-context.test.ts \
  src/lib/fixed-price-time-negative-wiring.test.ts \
  src/lib/invoice-source-integrity.test.ts
npm run lint
npx tsc --noEmit
```

Expected:

- Fixed Price rejected across all mutation paths.
- Legacy Fixed history remains readable.
- No UI code required for server protection.

### Commit boundary

```text
fix: block fixed-price time mutations
```

### Rollback

Revert code commit only. No destructive schema change in Phase 0A.

---

## 12. Phase 0B — Data Profiling and Classification

### Profiling SQL

Create `scripts/sql/billing-aware-preflight.sql` with:

```sql
-- Project counts by legacy and canonical model
SELECT billing_type, billing_model, count(*)
FROM projects GROUP BY billing_type, billing_model ORDER BY 1,2;

-- Package classification evidence
SELECT p.id, p.name, p.billing_type, p.selected_package_id,
       pk.name AS package_name, pk.hours, pk.allowance_type,
       pk.allowance_value, pk.lifecycle_class,
       count(DISTINCT te.id) AS time_entries,
       count(DISTINCT i.id) AS invoices
FROM projects p
LEFT JOIN packages pk ON pk.id = p.selected_package_id
LEFT JOIN time_entries te ON te.project_id = p.id
LEFT JOIN invoices i ON i.project_id = p.id
WHERE p.billing_type = 'package'
GROUP BY p.id, pk.id;

-- Fixed Price time states
SELECT p.id, p.name, te.status, te.invoice_id IS NOT NULL AS invoiced,
       count(*) AS entries, sum(te.duration_minutes) AS minutes
FROM projects p
JOIN time_entries te ON te.project_id = p.id
WHERE p.billing_type = 'project'
GROUP BY p.id, te.status, te.invoice_id IS NOT NULL;

-- Open timers on non-hourly candidates
SELECT te.id, te.user_id, te.project_id, p.billing_type, p.billing_model
FROM time_entries te
LEFT JOIN projects p ON p.id = te.project_id
WHERE te.end_time IS NULL;

-- Dependency counts
SELECT
  (SELECT count(*) FROM project_activities) AS project_activities,
  (SELECT count(*) FROM time_entries WHERE activity_id IS NOT NULL) AS activity_time_entries,
  (SELECT count(*) FROM project_services) AS project_services,
  (SELECT count(*) FROM package_orders) AS package_orders,
  (SELECT count(*) FROM custom_package_requests) AS custom_package_requests;
```

Add more queries for proposal/package/service relations as discovered.

### Classification table

Migration `drizzle/0061_legacy_billing_classification.sql`:

```sql
CREATE TABLE legacy_project_billing_classifications (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  legacy_billing_type text NOT NULL,
  target_billing_model text,
  confidence text NOT NULL DEFAULT 'unreviewed',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  CHECK (target_billing_model IS NULL OR target_billing_model IN ('fixed_price','retainer')),
  CHECK (confidence IN ('unreviewed','automatic','manual','blocked'))
);
```

### Deterministic mapping

- `project` → Fixed Price automatic.
- `hours` → Hourly automatic.
- `package` with explicit recurring lifecycle + monthly hours allowance + recurring invoice evidence → Retainer candidate.
- `package` with one-off outcome + fixed invoice evidence → Fixed Price candidate.
- Contradictory/incomplete → blocked manual review.

No migration continues while blocked count > 0 for target rows being cut over.

### Artifact

Write profiling result to:

```text
docs/audits/BILLING_AWARE_PREFLIGHT_DEV_YYYYMMDD.md
```

### Commit boundary

```text
chore: add billing migration preflight
```

### Rollback

Drop only additive classification table if unused. Never modify legacy rows in this phase.

---

## 13. Completeness Ledger

Every reference must be classified before deletion.

Legend:

- `HIDE`: remove active UI entry.
- `FREEZE`: reject new writes.
- `COMPAT_READ`: preserve historical read.
- `MIGRATE`: move to target model.
- `DELETE_LATER`: remove after reconciliation.
- `DEFER`: retain intentionally.

### Package

| Surface | Path | Action |
|---|---|---|
| Package actions | `src/lib/actions/packages.ts` | FREEZE → COMPAT_READ → DELETE_LATER |
| Orders | `src/lib/actions/package-orders.ts` | FREEZE public create; COMPAT_READ/admin transition |
| Custom requests | `src/lib/actions/custom-package-requests.ts` | FREEZE create; COMPAT_READ/resolve pending |
| Catalog UI | `src/components/packages/package-catalog.tsx` | HIDE |
| Portal order CTA | `src/components/portal/package-order-button.tsx` | HIDE; preserve historical order display |
| Portal custom request | `src/components/portal/custom-package-request-form.tsx` | HIDE; preserve historical request display |
| Project form | `src/components/forms/project-form.tsx` | HIDE Package selection; MIGRATE classified legacy |
| Invoice package amount | `src/lib/actions/invoices.ts` | COMPAT_READ old snapshots; replace new path |
| Portal project branch | `src/components/portal/project-accordion.tsx` | MIGRATE Retainer/Fixed branches |
| Tables | `packages`, `package_items`, `project_package_assignments` | COMPAT_READ → DELETE_LATER |
| Order/request tables | `package_orders`, `custom_package_requests` | DEFER historical ledger; do not drop in first cleanup |

### Activity

| Surface | Path | Action |
|---|---|---|
| CRUD | `src/lib/actions/activities.ts` | FREEZE |
| Policy | `src/lib/activity-policy.ts` | remove from new writes; COMPAT_READ legacy |
| DB policy | `src/lib/activity-policy-db.ts` | replace with Task/Project policy |
| Timer form | `src/components/time/timer-widget.tsx` | HIDE/remove |
| Manual form | `src/components/time/manual-entry-form.tsx` | HIDE/remove |
| Stop dialog | `src/components/time/stop-timer-dialog.tsx` | HIDE for new; legacy compatibility only |
| Weekly grid | `src/components/time/weekly-time-grid.tsx` | MIGRATE Project+Task |
| History | `src/components/time/timesheet.tsx` | no active Activity filter; legacy audit only |
| Rate calculation | `src/lib/actions/time.ts` | MIGRATE to Project rate snapshot |
| Reports/exports | reports and time export routes | MIGRATE to Task; legacy audit optional |
| Tables | `activities`, `project_activities` | COMPAT_READ → DELETE_LATER |
| `time_entries.activity_id` | schema | preserve until snapshot/reconciliation; then remove |
| `activity_logs` | audit log domain | DEFER; never delete |

### Service

| Surface | Path | Action |
|---|---|---|
| Catalog actions/UI | `src/lib/actions/services.ts`, `src/components/services/service-catalog.tsx` | FREEZE/HIDE |
| Project form selection | `src/components/forms/project-form.tsx` | HIDE for new Project |
| Proposal snapshots | `src/lib/actions/proposals.ts`, `src/lib/service-snapshots.ts` | COMPAT_READ |
| Project lines | `project_services` | DEFER as historical commercial snapshot |
| Invoice seeding | `src/lib/actions/invoices.ts` | COMPAT_READ legacy; no new catalog line generation |
| Task/time FK | `tasks.project_service_id`, `time_entries.project_service_id` | COMPAT_READ; remove only after dependency migration |
| Profitability | `src/lib/service-profitability-report.ts` | DEFER or redesign separately |
| Rate cards | `client_service_rate_cards` | DEFER until Project-rate replacement reconciled |

Before code deletion, generate exhaustive search artifact:

```bash
rg -n "package|Package|activityId|activities|projectActivities|serviceId|projectServices|billingType|selectedPackageId" src drizzle scripts docs \
  > docs/audits/BILLING_AWARE_REFERENCE_LEDGER.txt
```

Every line must map to one ledger action.

---

## 14. Billing Mutation Matrix

| Path | Fixed Price | Hourly | Retainer | Legacy Package |
|---|---|---|---|---|
| Timer start | Reject | Allow | Allow + resolve period | Reject |
| Timer resume | Reject | Allow | Allow | Reject |
| Timer stop/reassign | Reject target | Allow | Allow + period | Reject target |
| Manual entry | Reject | Allow | Allow + period | Reject |
| Weekly save/copy | Reject | Allow | Allow + period | Reject |
| Update entry | Immutable legacy only | Allow if draft | Allow if draft | Reject |
| Submit approval | Exclude | Member allow | Member allow | Exclude |
| Approve | Exclude | Other owner/admin | Other owner/admin | Exclude |
| Invoice import | Reject | Approved only | Reject base path; overage via period | Reject |
| Active timer options | Exclude | Include | Include | Exclude |
| Client portal time | Never | approved/invoiced | approved/invoiced current/history period | compatibility-safe only |

---

## 15. Billing Transition Matrix

| Transition | Rule |
|---|---|
| Fixed → Hourly | Allow only empty Project; derive recurring Tasks or require explicit conversion preview |
| Fixed → Retainer | Allow only empty Project; require full Retainer config |
| Hourly → Fixed with draft time | Block normal edit; migration wizard must resolve/archive time |
| Hourly → Fixed with approved time | Block |
| Hourly → Fixed with invoiced time | Permanently block normal edit |
| Hourly → Retainer | Block normal edit after time/invoice; migration wizard creates first period and preserves historical Hourly entries |
| Retainer → Hourly | Block after period exists |
| Package → Retainer | Classification workflow only |
| Package → Fixed | Classification workflow only |
| Ambiguous Package | Remains `legacy_package`; all new mutations blocked |

---

## 16. Invoice Integrity Matrix

Required invariants:

- One time entry cannot belong to two invoices.
- One Retainer period cannot have two non-cancelled invoices.
- Fixed invoice cannot accept `time_entry` source.
- Retainer base fee uses period snapshot, never current Project value.
- Overage uses approved minutes at period lock.
- Overage cannot be billed twice.
- Currency/rate snapshots never change after source mutation.
- Tenant cannot import another workspace source ID.
- Draft invoice reversal restores exact previous source status.
- Sent invoice reversal requires explicit owner/admin cancellation.
- Paid invoice source cannot be detached.

Migration `0059` must also add explicit invoice item source fields if absent:

```sql
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_items_time_entry_source_unique
  ON invoice_items(source_id)
  WHERE source_type = 'time_entry';
```

If existing schema uses another linking model, adapt migration after inspection; preserve same invariant.

---

## 17. Portal and Privacy Matrix

### Fixed Price

Expose:

- scope;
- Task progress;
- milestones;
- files/deliverables;
- approvals;
- invoices.

Never expose time through:

- HTML;
- RSC payload;
- server component props;
- public API/token endpoint;
- PDF/XLSX export;
- activity feed description;
- hidden DOM.

### Hourly/Retainer

Expose only approved/invoiced entries with:

- Project;
- Task;
- description;
- user display name;
- duration;
- work date.

Never expose draft/submitted time.

Legacy Activity label appears only in internal legacy audit, not client portal.

Public Package/order/request creation routes become unavailable. Historical records remain admin/client compatibility-readable only when authorization remains valid.

---

## 18. Implementation Phases

### Phase 0A — Server containment

Implement Section 11. No UI redesign first.

### Phase 0B — Profiling/classification

Implement Section 12. No destructive migration.

### Phase 1 — Waktu history-first UX

Files:

- `src/app/(app)/app/time/page.tsx`
- `src/components/time/time-route-content.tsx`
- `src/components/time/time-header.tsx`
- `src/components/time/manual-entry-form.tsx`
- `src/components/time/timer-widget.tsx`
- `src/components/time/stop-timer-dialog.tsx`
- new `src/components/time/waktu-history.tsx`
- new `src/components/time/add-time-log-dialog.tsx`
- new `src/components/time/new-timer-dialog.tsx`
- new `src/components/time/active-timer-card.tsx`
- new `src/lib/effective-work-date.ts`

Deliver:

- Harian/Mingguan.
- Date navigation.
- Two dialogs.
- Project→Task cascade.
- Current-user/date-scoped DB query.
- Manual duration visible.
- Active timer sync.
- Compatibility redirects.

Commit:

```text
feat: redesign time tracking around daily history
```

Rollback: revert UI commit; server containment remains.

### Phase 2 — Weekly and approval correctness

Files:

- `src/components/time/weekly-time-grid.tsx`
- `src/lib/weekly-time-grid.ts`
- `src/components/time/timesheet-approval-panel.tsx`
- `src/lib/actions/timesheet-approval.ts`
- `src/lib/timesheet-approval.ts`

Deliver:

- Project+Task weekly rows.
- Effective work date.
- Contextual approval.
- Owner/admin own-time auto-approved.
- Notes isolated per submission.
- Lock/reject/reopen behavior.

Commit:

```text
feat: align weekly time approval with task workflow
```

### Phase 3 — Billing schema compatibility

Apply migrations `0056`–`0061` only after dry-run on dev clone.

Commit:

```text
feat: add billing-aware compatibility schema
```

Rollback:

- additive columns/tables remain harmless;
- app dual-reads old fields;
- never drop legacy schema in rollback window.

### Phase 4 — Project/Task contextual UX

Files:

- `src/components/forms/project-form.tsx`
- `src/lib/actions/projects.ts`
- `src/components/forms/task-form.tsx`
- `src/lib/actions/tasks.ts`
- Project detail/task components.

Deliver:

- Harga Tetap, Per Jam, Retainer contextual fields.
- One-time vs recurring behavior.
- Unsafe transition block.
- Package/Activity/Service controls absent.

### Phase 5 — Fixed Price outcome workflow

Deliver milestones, fixed invoice source, portal no-time branch.

### Phase 6 — Hourly invoice integrity

Deliver approved-time invoice import, source uniqueness, reversal rules.

### Phase 7 — Retainer period ledger

Deliver period creation, usage, lock, base+overage invoice, idempotent cron.

### Phase 8 — Legacy cutover

Resolve classifications; cut over reads; preserve historical snapshots.

### Phase 9 — Destructive cleanup

Separate explicit approval required. Backup, reconciliation, migration dry-run, then remove obsolete Package/Activity dependencies and tables. Service schema is separate decision.

---

## 19. Test Files and Expected Results

### Billing model

- `src/lib/billing-model.test.ts`
- `src/lib/project-time-tracking-policy.test.ts`
- `src/lib/time-entry-context.test.ts`

Expected: Fixed/legacy Package reject time; Hourly/Retainer allow valid Task context.

### Mutation matrix

- `src/lib/fixed-price-time-negative-wiring.test.ts`
- DB integration test for every row in Section 14.

### Transition matrix

- `src/lib/billing-transition-policy.test.ts`

Expected: only empty supported transitions pass; transactional history blocks unsafe changes.

### Retainer

- `src/lib/retainer-period.test.ts`
- `src/lib/retainer-invoice-policy.test.ts`

Expected:

- month boundary/timezone correct;
- reset day 1–28;
- no carry-over;
- config changes next period;
- unique active invoice;
- cancellation/retry safe;
- overage once.

### Invoice

- `src/lib/invoice-source-integrity.test.ts`

Expected Section 16 invariants.

### Portal

- `src/lib/portal-billing-visibility.test.ts`
- authenticated/public browser E2E.

Expected no Fixed time in HTML, RSC payload, API, exports.

### Approval

- member cannot self-approve;
- admin/owner can approve others;
- owner/admin own entries auto-approved;
- selected timezone week correct;
- manual and timer entries included;
- approved/invoiced lock.

### Commands per commit

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build -- --webpack
```

Before phase merge:

```bash
npm audit --omit=dev
node scripts/smoke.mjs
```

After dev deployment:

- authenticated browser mutation E2E;
- 1440×1000, 768×1024, 390×844, 375×812;
- `/api/health` returns `{"status":"ok","db":"ok"}`;
- source SHA = image revision = `dev/integration` SHA;
- production container ID/created timestamp unchanged.

---

## 20. Commit and Deployment Boundaries

Each phase:

1. Start from clean branch/worktree.
2. Write failing invariant tests.
3. Implement minimum code.
4. Run targeted tests.
5. Run lint/typecheck/full tests/build.
6. Commit one coherent phase.
7. Push feature branch.
8. Merge into `dev/integration` only after gate.
9. Deploy dev.
10. Verify runtime/browser/DB.
11. Update changelog, migration registry, audit artifact.
12. Never deploy production without explicit Alip approval.

---

## 21. Definition of Done

A task is not done because UI disappeared.

Done requires:

- exact server invariant enforced;
- tenant/permission validation;
- migration registered and reversible/additive where possible;
- historical data preserved;
- mutation test passes;
- browser flow passes;
- DB reconciliation passes;
- dev source/image/health match;
- docs and ledger updated;
- commit pushed;
- production unchanged.

---

## 22. Canonical Summary

```text
Package                 → freeze, classify, compatibility-read, remove later
Activity                → freeze, remove from new writes, compatibility-read, remove later
Service catalog         → hide/freeze; preserve commercial snapshots
Billing model           → fixed_price | hourly | retainer | legacy_package
Fixed Price             → outcome only; no mutable/client-visible time
Hourly                  → recurring Task + approved time + hourly invoice
Retainer                → recurring Task + monthly period ledger + base/overage invoice
Task input               → Project first, then Task
Task requirement         → required at manual save and timer start
Description requirement  → manual save and timer stop
Rate                     → entry snapshot → Project rate → workspace default
Waktu                    → history-first Harian/Mingguan
Actions                  → Catat Waktu | Mulai Timer
Approval                 → weekly contextual; owner/admin approve others
Owner/admin own time     → auto-approved
Client time              → approved/invoiced Hourly/Retainer only
Legacy Fixed time        → internal immutable audit only
Production               → hold until explicit approval
```

This document is implementation-ready for Phase 0A and Phase 0B. Later destructive cleanup remains gated by dev profiling/classification evidence and explicit approval.
