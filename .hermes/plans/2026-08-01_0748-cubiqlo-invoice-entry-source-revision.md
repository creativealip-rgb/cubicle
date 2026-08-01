# Cubiqlo Invoice Entry & Source Mode Revision Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Status:** Complete and deployed. Server source contract, migration `0066`, scoped entry points, atomic Hourly/cancellation flows, Fixed progress preview/default, in-form eligible Time Entry picker, Retainer project actions/usage summary, behavioral PostgreSQL concurrency proof, desktop/mobile QA, production backup/restore rehearsal, production migration, deployment, DB/log reconciliation, and routing verification are complete. Implementation commits: `d3d4438`, `0c96988`, `2efcc9b`; production release evidence: `ae1f4f8`.

**Completed:** 2026-08-01

**Production release:** Image `cubiqlo-prod:2efcc9b4365ccf5c1d3602b0a407edae8e3747da-invoice-source-20260801` runs as `cubiqlo-new-app`. Migration `0066` is applied to `cubicle`. Backup `/root/backups/cubiqlo/cubicle_pre0066_20260801T215616.dump` has SHA-256 `fcbfdd3d0bb6ea353ebe3de78471e6051f05ca54f4f695f34679150a404c5aab`; disposable restore parity passed. Targeted suite is 24/24, browser matrix 25/25, production Time Entry source reconciliation 57/57 with zero duplicates, app/database health is `ok`, and `dokploy-traefik` remains sole public 80/443 owner.

**Separate follow-up:** React hydration `#418` on existing Hourly/Retainer project pages has been resolved.

**Goal:** Make invoice creation support global, client-scoped, and project-scoped entry points while preserving accounting integrity for Fixed Price, Hourly, and Retainer billing.

**Architecture:** Keep one reusable `InvoiceForm`, but treat source selection as a server-validated discriminated contract, not UI state. Build invoice lines through domain helpers, store source intent and period metadata, enforce tenant and source uniqueness in PostgreSQL, then expose the same contract through each entry point. Reuse existing Retainer period workflow instead of creating a parallel billing system.

**Tech Stack:** Next.js App Router, React 19, Server Actions, Drizzle ORM, PostgreSQL, Vitest, Playwright.

---

## 1. Repository Reality

Existing behavior and structures that this plan must preserve:

- Global invoice creation exists at `/app/invoices/new`.
- Project invoice creation exists through `ProjectInvoiceCreateDialog`.
- Client Invoice tab lacks a create action.
- `createInvoice()` already validates workspace/client/project ownership and supports multiple project IDs.
- `invoiceItems` already supports `sourceType`, `sourceId`, `originalCurrency`, `originalAmount`, `conversionRate`, and `previousTimeEntryStatus`.
- Hourly import already links invoice items to time entries and changes time-entry status from `approved` to `invoiced`.
- Retainer workflow already exists in `src/lib/actions/retainers.ts` with:
  - `retainerPeriods`
  - `open → locked → invoiced` lifecycle
  - period snapshots
  - duplicate-period protection
  - invoice cancellation returning period to `locked`
- `invoices` already has `billingSource`, `billingPeriodStart`, `billingPeriodEnd`, and `retainerPeriodId`.
- Current project auto-item behavior has two paths inside `createInvoice()` and must be consolidated.

Do not create a second Retainer period implementation. Do not rely on UI-only source validation.

---

## 2. Product Contract

### 2.1 Entry points

| Entry point | Scope | Allowed project selection |
| --- | --- | --- |
| Global `/app/invoices/new` | Any client in current workspace | Zero or multiple projects belonging to selected client |
| Client Invoice tab | Current client only | Zero or multiple projects belonging to current client |
| Project Invoice tab | Current client and project only | Exactly current project |

Scope rules are server invariants. Hidden selectors are not authorization.

### 2.2 Multi-project policy

Source modes are per selected project, not one mode for an entire multi-project invoice.

- No-project invoice: manual items only.
- One selected project: one source configuration for that project plus optional manual adjustments.
- Multiple selected projects: one source configuration per project.
- Projects from different clients or workspaces are forbidden.
- Mixed billing models in one invoice are allowed only when every project source can be resolved independently into invoice lines in the same invoice currency.
- Retainer period sources are excluded from generic multi-project creation in this revision. They continue through the existing Retainer period action because period locking and idempotency are separate lifecycle concerns.

### 2.3 Source modes

```ts
export type ProjectInvoiceSource =
  | { mode: "fixed_full"; projectId: string }
  | { mode: "fixed_dp"; projectId: string; amountType: "percent" | "amount"; value: number }
  | { mode: "fixed_milestone"; projectId: string; milestoneName: string; amountType: "percent" | "amount"; value: number }
  | { mode: "fixed_final"; projectId: string }
  | { mode: "hourly_timesheet"; projectId: string; periodStart: string; periodEnd: string; timeEntryIds: string[] }
  | { mode: "hourly_deposit"; projectId: string; description: string; amount: number };

export type ManualInvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};
```

Retainer remains a separate typed workflow:

```ts
export type RetainerInvoiceSource = {
  mode: "retainer_period";
  retainerPeriodId: string;
  issueDate: string;
  dueDate?: string;
};
```

`retainer_timesheet_summary` is presentation on a Retainer period invoice, not a second charge mode. Existing period usage supplies the summary.

`retainer_overage` is part of existing Retainer period line generation and snapshots, not a standalone generic invoice mode.

`retainer_deposit` is a manual adjustment associated with a Retainer project, not a Retainer period invoice. It does not consume time entries or mark a period invoiced.

### 2.4 Fixed Price rules

- Agreed amount comes from server-side project/package data.
- Prior billed amount is the sum of active Fixed Price source items for the project in original project currency.
- Active statuses: `draft`, `sent`, `viewed`, `paid`, `overdue`.
- `cancelled` and `archived` do not reduce remaining.
- `fixed_full` is valid only when prior billed amount is zero. Amount equals full agreed amount.
- `fixed_final` amount equals current remaining.
- `fixed_dp` and `fixed_milestone` require exactly one amount representation: percent or amount.
- Percent must satisfy `0 < percent <= 100`.
- Resolved amount must satisfy `0 < amount <= remaining`.
- Fixed source amount exceeding remaining is rejected server-side.
- Manual adjustment may exceed remaining because it is not classified as Fixed Price progress.
- Monetary calculations use decimal-safe helpers or numeric strings; no unbounded binary-float accumulation.

### 2.5 Hourly rules

- `hourly_timesheet` accepts only selected time entry IDs from target project/client/workspace.
- Every selected entry must be `approved`, `billable`, completed, positive duration, and have a positive rate snapshot.
- Time entries already linked to an invoice cannot be selected.
- Source linking, invoice item insertion, and status transition to `invoiced` occur atomically.
- `hourly_deposit` creates a manual/project-associated line but does not link or consume time entries.
- Hourly project selection never auto-creates a zero-value line.

Period semantics:

- `periodStart` is inclusive.
- `periodEnd` is exclusive.
- Dates use workspace timezone if configured; otherwise application billing timezone documented by existing project convention.
- Entry eligibility uses `workDate` when present, otherwise `startTime` converted to billing timezone.
- Existing duration snapshot remains authoritative; do not recalculate completed duration from current clock time.

### 2.6 Retainer rules

- Reuse `retainerPeriods` and `src/lib/actions/retainers.ts`.
- Period range remains `[periodStart, periodEnd)`.
- Generic `createInvoice()` must not create a `retainer_period` invoice.
- Existing `createRetainerInvoice()` remains authoritative for period invoice creation.
- A Retainer period must be `locked` before invoicing.
- One non-cancelled invoice per Retainer period.
- Base fee does not consume time entries.
- Overage uses period snapshots and approved billable minutes linked to that period.
- `retainer_timesheet_summary` displays approved usage without adding a duplicate base fee.
- Cancelling a Retainer invoice follows existing `draft|sent → cancelled` flow and returns period to `locked`.

### 2.7 Cancellation lifecycle

| Invoice source | Allowed cancellation | Source release |
| --- | --- | --- |
| Manual/Fixed/Hourly deposit draft | `draft → cancelled` | No external source |
| Hourly timesheet draft | `draft → cancelled` | Linked entries return to prior status |
| Generic sent/viewed/overdue | Deferred in this revision | Must not silently mutate accounting state |
| Paid invoice | Forbidden | Requires future credit-note/reversal workflow |
| Retainer period | Existing Retainer action: `draft|sent → cancelled` | Period returns to `locked` |

Generic cancellation and source release must execute in one DB transaction. Do not call a helper that opens a separate transaction or writes through global `db` while an outer transaction is active.

---

## 3. Persistence and DB Invariants

### 3.1 Source metadata

Add source intent to invoice items because multi-project invoices can contain different modes.

**Modify:** `src/db/schema.ts`

Proposed additive columns:

```ts
sourceMode: text("source_mode", {
  enum: [
    "fixed_full",
    "fixed_dp",
    "fixed_milestone",
    "fixed_final",
    "hourly_timesheet",
    "hourly_deposit",
    "manual_adjustment",
    "retainer_base",
    "retainer_overage",
  ],
}),
sourceMetadata: jsonb("source_metadata").$type<{
  milestoneName?: string;
  requestedPercent?: string;
  periodStart?: string;
  periodEnd?: string;
}>(),
```

Keep `sourceType` as broad entity linkage and `sourceMode` as billing intent.

### 3.2 Time-entry uniqueness

Add partial unique index:

```ts
uniqueIndex("invoice_items_time_entry_source_uidx")
  .on(table.sourceId)
  .where(sql`${table.sourceType} = 'time_entry' and ${table.sourceId} is not null`)
```

Before migration, profile duplicate active links. Migration must fail with actionable output if duplicates exist; do not silently delete financial rows.

### 3.3 Fixed-source representation

All Fixed Price modes store:

- `sourceType = "project"`
- `sourceId = project.id`
- `sourceMode = selected fixed mode`
- `originalCurrency = project.currency`
- `originalAmount = resolved fixed-source amount`
- `conversionRate = invoice conversion snapshot`

Manual adjustment stores `sourceType = "manual"`, `sourceMode = "manual_adjustment"`, and does not reduce Fixed Price remaining.

### 3.4 Migration rollback

Migration is additive. Rollback may remove new index and columns only after code rollback no longer reads/writes them. It must not delete invoice data.

---

## 4. Files To Change

### Domain and persistence

- Modify: `src/db/schema.ts`
- Create: next sequential Drizzle migration after inspecting current migration ledger
- Create: `src/lib/invoice-source-contract.ts`
- Create: `src/lib/invoice-source-builders.ts`
- Create: `src/lib/invoice-fixed-progress.ts`
- Create: `src/lib/invoice-time-entry-source.ts`
- Modify: `src/lib/invoice-project-items.ts`
- Modify: `src/lib/actions/invoices.ts`
- Modify only as needed: `src/lib/actions/retainers.ts`

### UI

- Modify: `src/components/forms/invoice-form.tsx`
- Create: `src/components/invoices/client-invoice-create-dialog.tsx`
- Create: `src/components/invoices/invoice-source-mode-selector.tsx`
- Create: `src/components/invoices/fixed-source-fields.tsx`
- Create: `src/components/invoices/hourly-source-panel.tsx`
- Modify: `src/components/invoices/project-invoice-create-dialog.tsx`
- Modify: `src/app/(app)/app/invoices/new/page.tsx`
- Modify: `src/app/(app)/app/clients/[clientId]/page.tsx`
- Modify: `src/app/(app)/app/projects/[projectId]/page.tsx`

### Tests

- Create: `src/lib/invoice-source-contract.test.ts`
- Create: `src/lib/invoice-fixed-progress.test.ts`
- Create: `src/lib/invoice-time-entry-source.test.ts`
- Create: `src/lib/invoice-create-action.test.ts`
- Create: `src/lib/invoice-cancellation.test.ts`
- Extend Retainer tests instead of duplicating them
- Create: `e2e/invoice-entry-scope.spec.ts`

---

## Phase 0 — Baseline and migration audit

### Task 0.1: Capture baseline

**Run:**

```bash
npm test
npm run lint
npm run build
```

Record pre-existing failures. New failures block implementation.

### Task 0.2: Inspect migration ledger and live schema assumptions

Verify:

- Latest migration number and journal state.
- Existing invoice-item source indexes.
- Existing duplicate time-entry source links.
- Existing Retainer-period uniqueness.
- Actual workspace timezone source.

Profiling SQL must be written against actual table/column names found in schema.

### Task 0.3: Write failing contract tests

Tests must cover behavior, not only source-string inspection:

- Allowed source modes after `resolveBillingModel()` normalization.
- Invalid source mode rejected for billing model.
- Fixed DP/milestone input validation.
- Scope mismatch rejected.
- Retainer period source rejected by generic create action.

**Commit:**

```bash
git add src/lib/*invoice*test.ts
git commit -m "test: define invoice source contracts"
```

---

## Phase 1 — Add persistence invariants

### Task 1.1: Add invoice-item source metadata migration

**Steps:**

1. Write duplicate-profiling query/test.
2. Add schema columns and partial unique index.
3. Generate next sequential migration.
4. Inspect generated SQL.
5. Apply to disposable/local DB.
6. Verify index rejects duplicate time-entry source linkage.
7. Verify existing invoices remain readable.

**Expected:** additive migration; no financial rows rewritten.

### Task 1.2: Add schema-level tests

Assert exact columns, enum values, and partial unique index predicate.

**Commit:**

```bash
git add src/db/schema.ts drizzle src/lib/*schema*test.ts
git commit -m "feat: persist invoice source intent"
```

---

## Phase 2 — Build server-side source contract

### Task 2.1: Add discriminated schemas

**Create:** `src/lib/invoice-source-contract.ts`

Use Zod discriminated unions. Normalize legacy billing values through `resolveBillingModel()` before policy checks.

Tests:

- Every valid mode parses.
- Missing milestone name fails.
- DP with both percent and amount fails.
- Zero/negative inputs fail.
- Hourly source without entries fails.
- Unknown keys/modes fail.

### Task 2.2: Add Fixed Price progress helper

**Create:** `src/lib/invoice-fixed-progress.ts`

Responsibilities:

- Load agreed amount in project currency.
- Sum active Fixed Price item `originalAmount` values.
- Exclude cancelled and archived invoices.
- Resolve mode amount.
- Reject overbilling.
- Produce description and source metadata.

Tests must cover full, DP percent, DP amount, milestone, final, rounding, fully invoiced project, cancelled/archived history, and concurrent stale calculation handling.

### Task 2.3: Add Hourly source helper

**Create:** `src/lib/invoice-time-entry-source.ts`

Responsibilities:

- Validate workspace/client/project ownership.
- Apply period `[start, end)`.
- Lock selected rows with `FOR UPDATE` inside caller transaction.
- Validate status, billability, completion, duration, and rate snapshot.
- Check existing source links.
- Build invoice lines.
- Conditionally transition selected entries to `invoiced` and verify affected row count.

### Task 2.4: Consolidate amount and line builders

**Create:** `src/lib/invoice-source-builders.ts`

Delete duplicated auto-item policy from `createInvoice()`. One builder must return canonical lines for each project source. `resolveProjectAmount()` may remain for display compatibility but must not control accounting policy by itself.

**Commit:**

```bash
git add src/lib/invoice-source-*.ts src/lib/invoice-fixed-progress.ts src/lib/invoice-project-items.ts
git commit -m "feat: add server invoice source builders"
```

---

## Phase 3 — Integrate atomic invoice creation

### Task 3.1: Revise create payload

Replace implicit `projectId/projectIds` billing behavior with explicit `projectSources` while retaining a temporary compatibility read only if existing callers require it.

Server validation order:

1. Authenticate user and writable workspace.
2. Parse payload.
3. Validate scoped client/project constraints.
4. Validate all projects belong to client and workspace.
5. Validate one source per project and no duplicate project IDs.
6. Reject Retainer period source in generic action.
7. Lock/resolve source rows inside transaction.
8. Insert invoice, source lines, manual lines, and status transitions atomically.
9. Calculate totals from inserted rows.

No invoice may be created with zero valid lines.

### Task 3.2: Preserve multi-project invoice linkage

- If exactly one project source exists, `invoices.projectId` may store that project.
- If multiple project sources exist, `invoices.projectId = null`.
- Project association remains authoritative in `invoiceItems.sourceId`.

### Task 3.3: Add action integration tests

Use a disposable test DB or established DB test harness. Cover:

- Workspace/client/project isolation.
- Fixed amount correctness.
- Manual adjustment exclusion from remaining.
- Hourly import linkage.
- Duplicate source concurrency.
- Mixed project sources.
- Missing exchange rate rollback.
- Any failure leaves no partial invoice/items/status updates.

**Commit:**

```bash
git add src/lib/actions/invoices.ts src/lib/invoice-create-action.test.ts
git commit -m "feat: create invoices from validated sources"
```

---

## Phase 4 — Cancellation integrity

### Task 4.1: Make source release transaction-aware

Change `revertInvoiceTimeEntrySources` to accept transaction executor. Generic cancellation must:

1. Lock invoice.
2. Confirm status is `draft`.
3. Lock linked time entries.
4. Restore previous statuses conditionally.
5. Mark invoice cancelled.
6. Preserve invoice items for audit unless existing product contract explicitly requires draft-item deletion; choose one behavior and test it consistently.

Recommended: preserve cancelled invoice items for financial audit and exclude them through invoice status filters.

### Task 4.2: Keep Retainer cancellation separate

Do not route Retainer period invoices through generic cancellation. Existing `cancelRetainerInvoice()` owns period rollback.

### Task 4.3: Add lifecycle tests

Cover generic draft, Hourly draft, sent generic rejection, paid rejection, Retainer draft/sent cancellation, and repeated cancellation idempotency/error behavior.

**Commit:**

```bash
git add src/lib/actions/invoices.ts src/lib/actions/retainers.ts src/lib/invoice-cancellation.test.ts src/lib/retainer-*.test.ts
git commit -m "fix: preserve invoice source integrity on cancellation"
```

---

## Phase 5 — Add client-scoped entry point

### Task 5.1: Create shared project DTO

Avoid duplicated local `ProjectOption` definitions. Include:

- IDs and ownership fields
- normalized billing model
- currency
- fixed/package amount inputs
- hourly display rate
- Retainer fields needed only for routing/display

### Task 5.2: Create `ClientInvoiceCreateDialog`

- Scope client with `scopedClientId`.
- Pass only current-client projects from server loader.
- No client selector.
- Keep dialog mobile-safe and scrollable.

### Task 5.3: Wire client Invoice tab

Add `Buat Invoice` above invoice list. Query workspace currency data using existing invoice-page pattern.

### Task 5.4: Component and browser tests

Test button visibility, hidden client selector, current-client project list, successful one- and multi-project creation, and DB linkage via invoice items.

**Commit:**

```bash
git add src/components/invoices/client-invoice-create-dialog.tsx src/app/'(app)'/app/clients/'[clientId]'/page.tsx src/lib/invoice-entry-scope-wiring.test.ts
git commit -m "feat: add client-scoped invoice creation"
```

---

## Phase 6 — Source-mode UI

### Task 6.1: Add mode selector per project

Allowed choices:

- Fixed Price: full, DP, milestone, final.
- Hourly: approved timesheet, deposit.
- Retainer: link user to existing Retainer period flow; generic dialog offers deposit/manual only.

Safe defaults:

- Fixed Price with no history: `fixed_full`.
- Fixed Price with history: `fixed_final`.
- Hourly: no automatic source until user chooses timesheet or deposit.
- Retainer: no generic auto-charge.

### Task 6.2: Add mode-specific fields

- DP: percent/amount toggle and value.
- Milestone: name plus percent/amount.
- Hourly timesheet: period and explicit eligible-entry selection/preview.
- Deposit: description and amount.
- Fixed progress: agreed, previously invoiced, remaining.

Server remains authoritative; preview is advisory.

### Task 6.3: Reset stale state

When client, project set, billing mode, or source mode changes:

- Remove incompatible source fields.
- Remove stale selected time IDs.
- Remove stale generated preview lines.
- Preserve explicit manual adjustments only when user confirms they remain relevant.

Add reducer/helper tests for every transition.

### Task 6.4: Remove default empty manual row beside generated source

- Start empty for source-backed project invoice.
- Show manual row only after `+ Item` or deposit/manual selection.
- No hourly `Rp 0` project line.
- No Retainer `Rp 0` line.

**Commit:**

```bash
git add src/components/forms/invoice-form.tsx src/components/invoices src/lib/*source*test.ts
git commit -m "feat: add explicit invoice source selection"
```

---

## Phase 7 — Retainer integration and presentation

### Task 7.1: Route Retainer period action correctly

Project Invoice tab for Retainer must expose:

- `Buat Invoice Periode Retainer` using existing period lifecycle.
- `Buat Deposit/Item Manual` through generic invoice form.

Do not show generic `retainer_period`, `retainer_overage`, or summary modes as independent charge sources.

### Task 7.2: Add period usage summary

Display existing period snapshots and approved usage:

```text
Periode: 1–31 Agustus 2026
Biaya retainer: Rp 5.000.000
Termasuk: 20 jam
Terpakai disetujui: 23 jam
Overage: 3 jam · Rp 450.000
```

Overage line only exists when snapshot policy is `bill` and rate is valid.

### Task 7.3: Extend Retainer tests

Cover period idempotency, base plus overage lines, summary without duplicate charge, warning/none policy, cancellation rollback, and reinvoice generation.

**Commit:**

```bash
git add src/lib/actions/retainers.ts src/components src/lib/retainer-*.test.ts
git commit -m "feat: integrate retainer period invoice entry"
```

---

## Phase 8 — Full verification

### Task 8.1: Automated quality gates

```bash
npm test
npm run lint
npm run build
```

Expected: no new failures; all new source-contract and lifecycle tests pass.

### Task 8.2: Concurrency proof

Run two parallel requests using same Hourly time entry. Expected:

- One succeeds.
- One fails with clean duplicate/already-invoiced error.
- Exactly one source-linked invoice item exists.
- Time entry status is `invoiced`.

Run two parallel Fixed Final requests. Expected:

- Combined active Fixed source amount never exceeds agreed amount.
- Stale second request fails or recalculates under lock.

### Task 8.3: Desktop browser matrix

Global:

- Manual no-project invoice.
- One Fixed project.
- Two same-client projects.
- Mixed Fixed and Hourly deposit sources.
- Other clients selectable.

Client:

- Create button visible.
- No client selector.
- Only current-client projects.
- One- and multi-project create.

Project:

- Scope fixed to project.
- Fixed full/DP/milestone/final.
- Hourly deposit and timesheet.
- Retainer period route and manual deposit.

Lifecycle:

- Cancel Hourly draft and reselect released entries.
- Cancel Retainer invoice and verify period returns to locked.
- Reject paid cancellation.

### Task 8.4: Mobile QA

Viewport: `390x844`.

Verify dialog scroll, source selector, period picker, time-entry list, DP/milestone fields, no overflow, reachable submit, and readable errors.

### Task 8.5: DB reconciliation

Use joins through invoice items for multi-project proof:

```sql
select
  i.invoice_number,
  i.client_id,
  i.status,
  ii.source_type,
  ii.source_mode,
  ii.source_id,
  ii.original_currency,
  ii.original_amount,
  p.client_id as project_client_id,
  p.workspace_id as project_workspace_id
from invoices i
join invoice_items ii on ii.invoice_id = i.id
left join projects p
  on ii.source_type = 'project'
 and ii.source_id = p.id
where i.invoice_number like 'QA-%'
order by i.created_at desc, ii.id;
```

Verify:

- Every project source belongs to invoice client/workspace.
- Fixed progress sum never exceeds agreed amount.
- No duplicate time-entry source link.
- Cancelled/archived Fixed invoices are excluded from remaining.
- Retainer invoice points to expected period and date range.

### Task 8.6: Logs and evidence

```bash
docker logs --since 15m cubiqlo-new-app 2>&1 | grep -Ei 'error|exception|failed|fatal|digest|invoice|validation' | tail -100
```

Save screenshots under `docs/qa-screenshots/invoice-source-revision/` and bounded logs under `/tmp/cubiqlo-invoice-revision-*`.

---

## Acceptance Criteria

- Global invoice entry remains unrestricted within current workspace.
- Client Invoice tab supports current-client manual and multi-project invoices.
- Project Invoice tab remains strictly scoped.
- Every project charge has explicit, server-validated source intent.
- Fixed full, DP, milestone, and final update remaining amount correctly.
- Fixed source amount cannot exceed remaining under concurrent requests.
- Manual adjustments do not reduce Fixed Price remaining.
- Hourly source imports only approved, billable, completed, positive, uninvoiced entries.
- One time entry cannot be invoiced twice, including concurrent requests.
- Hourly deposit does not consume time entries.
- Hourly project never auto-displays a misleading zero-value charge.
- Retainer period invoices reuse existing period lifecycle and idempotency.
- Retainer base, summary, and overage do not double charge.
- Generic and Retainer cancellation release their sources atomically according to lifecycle contract.
- Multi-project DB proof uses invoice-item sources, not only `invoices.project_id`.
- Desktop/mobile browser QA, DB reconciliation, logs, tests, lint, and build pass.

---

## Explicitly Deferred

- Cancelling paid invoices, credit notes, and payment reversals.
- Generic cancellation of sent/viewed/overdue non-Retainer invoices.
- Retainer period invoice inside generic multi-project invoice.
- Cross-client invoice.
- Automatic recurring invoice generation.
- Editing source intent after invoice leaves draft.

Deferred items must not be represented as completed during delivery.

---

## Final Verification Commands

```bash
npm test -- src/lib/invoice-source-contract.test.ts
npm test -- src/lib/invoice-fixed-progress.test.ts
npm test -- src/lib/invoice-time-entry-source.test.ts
npm test -- src/lib/invoice-create-action.test.ts
npm test -- src/lib/invoice-cancellation.test.ts
npm test -- src/lib/retainer-period-phase7.test.ts
npm test
npm run lint
npm run build
```

Before implementation begins, re-read this Markdown as raw text and verify all referenced paths against current `main` HEAD. Before any later deployment, follow Cubiqlo deploy skill and VPS deployment guardrails separately; this plan does not authorize deployment.
