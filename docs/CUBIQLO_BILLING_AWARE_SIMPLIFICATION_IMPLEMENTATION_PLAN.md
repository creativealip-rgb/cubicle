# Cubiqlo Billing-Aware Simplification — Implementation Plan

**Status:** Approved for staged implementation on dev
**Owner:** Alip
**Prepared:** 28 July 2026
**Baseline:** `dev/integration` at `47095d0ac4ad7911082c5f2a4f01cde27f1118e8`
**Production gate:** No production deploy without explicit Alip approval

## 1. Product Direction

Cubiqlo organizes work based on how client pays:

```text
Harga Tetap → manage outcome and completion
Per Jam     → prove time worked
Retainer    → control recurring capacity
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

Time applies only to Per Jam and Retainer:

```text
Project → Task → Work Description → Time Log
```

## 2. Locked Decisions

### Remove from active product UX

- Package.
- Activity.
- Service catalog.
- Time Log for Fixed Price.
- `Timer | Lembar Waktu | Riwayat | Persetujuan | Kelola Aktivitas | Tautan` navigation.
- Fixed Price from every timer, manual-entry, weekly-time, approval, time-report, and uninvoiced-time selector.

### Keep temporarily for compatibility

- Existing Package, Activity, and Service tables.
- Historical Package orders/assignments.
- Historical Activity relationships.
- Historical Service/project commercial snapshots.
- Historical Fixed Price time records as read-only audit data.

Schema deletion happens only after classification, reconciliation, backup, and read-path cutover.

### Billing model

```text
Legacy `project` → Harga Tetap / Fixed Price
Legacy `hours`   → Per Jam / Hourly
Legacy `package` → ambiguous; classify as Retainer, Fixed Price, or manual review
```

Never automatically rename every `package` project to Retainer.

### Task behavior

- Fixed Price: one-time Task, completion-oriented.
- Per Jam: recurring Task, active/archive lifecycle.
- Retainer: recurring Task, active/archive lifecycle.
- Task is mandatory for new Per Jam/Retainer time records.
- Project is selected before Task in time dialogs.
- Client follows Project automatically.

### Approval

- Fixed Price: no time approval.
- Solo owner: own time auto-approved.
- Member Per Jam/Retainer: submit one weekly timesheet.
- Owner/manager: approve or reject submitted week.
- Approved time becomes invoice-eligible and client-visible.
- Approved Retainer time becomes final usage.
- Approval is contextual in Weekly view, not a permanent tab.
- No client approval per time log.
- No multi-level approval.

## 3. Final Navigation

Sidebar remains:

```text
Dashboard
Pekerjaan
  Klien
  Proyek
  Tugas
Waktu
Kalender
File
Keuangan
  Invoice
  Pengeluaran
  Laporan
Personal
AI
```

Do not add Package, Activity, or Service back to sidebar.

### Waktu page navigation

One page:

```text
Waktu

[ previous ] [ selected date/period ] [ next ] [ Hari Ini ]
                                      [ Harian | Mingguan ]

[ + Catat Waktu ] [ Mulai Timer ]
```

No route tabs inside Waktu.

Compatibility routes:

- `/app/time/history` → redirect to `/app/time?view=day`.
- `/app/time/timesheet` → redirect to `/app/time?view=week`.
- `/app/time/approvals` → redirect to selected weekly view or retain temporary owner deep link during transition.
- `/app/time/activities` → redirect to `/app/time`.
- `/app/activities`, `/app/packages`, `/app/services` → redirect or unavailable after legacy write freeze.

## 4. Final Waktu Page

### Desktop

```text
Waktu

[‹] Selasa, 28 Juli 2026 [›] [Hari Ini]       [Harian | Mingguan]

[+ Catat Waktu] [Mulai Timer]

Total hari ini                                      7j 00m

Website Redesign · Kopi Senja Studio
Frontend Development
Implementasi hero dan section layanan              2j 30m   [⋯]

VA Support · Client A
Kelola Email
Balas 18 email dan follow-up vendor                1j 20m   [⋯]
```

Row hierarchy:

```text
Project · Client
Task
Work description
Duration
```

Row actions:

- Edit, when status allows.
- Copy.
- Start again.
- Delete, when status allows.

Approved/invoiced rows are read-only except explicit reversal workflow.

### Mobile

```text
Waktu

[‹ 28 Jul ›] [Hari Ini]
[Harian | Mingguan]

[+ Catat] [Timer]

Total 7j

Project · Client
Task
Description                                 2j 30m
```

No horizontal overflow. No desktop grid forced into mobile.

### Daily view

- DB query scoped to current workspace, current user, and selected day.
- Owner may select another team member only through explicit team filter/manager context.
- Effective work date:
  - duration/manual entry uses `workDate`;
  - live timer entry uses `startTime` in workspace/user timezone.
- Total selected day.
- Optional compact grouping of repeated Project+Task sessions.

### Weekly view

Desktop can show summary rows:

```text
Project · Task                  Sen Sel Rab Kam Jum Total
VA Support · Kelola Email        2j  1j  2j  1j  2j   8j
```

Mobile shows sections per day.

Weekly view includes contextual submission/approval state:

Member:

```text
27 Jul–2 Agu · 24j 30m · Belum dikirim
[Kirim Minggu Ini]
```

Owner:

```text
2 timesheet menunggu persetujuan
[Tinjau]
```

## 5. Time Input Dialogs

Two actions remain separate because intent differs.

### `+ Catat Waktu`

For completed work:

```text
Project
Task
Deskripsi Pekerjaan
Durasi
Tanggal
[Batal] [Simpan]
```

### `Mulai Timer`

For work starting now:

```text
Project
Task
Deskripsi Pekerjaan — optional at start
[Batal] [Mulai]
```

Before timer can be stopped/finalized, description must exist.

### Selector rules

Project options:

- active;
- accessible to current user;
- Per Jam or Retainer only;
- not Fixed Price;
- not archived/completed.

Task options:

- disabled until Project selected;
- belongs to selected Project;
- recurring and active;
- accessible to current user;
- archived Task excluded.

Client is resolved from Project server-side. Browser does not submit authoritative client identity.

Not shown:

- Client selector.
- Activity.
- Package.
- Service.
- Tag.
- Rate.
- Billable toggle.
- Cost.
- Time tracking mode.

If selected Project has no active Task:

```text
Project ini belum punya Task.
[+ Buat Task]
```

Quick Task dialog contains only Task name and saves into selected Project.

## 6. Active Timer

After start, dialog closes. Waktu page shows:

```text
Sedang Berjalan
Project · Client
Task
Description
00:42:18
[Jeda] [Selesai]
```

Rules:

- Only one active timer per user/workspace.
- Starting another timer must explicitly stop or switch from active timer; no silent data loss.
- Topbar and Waktu page share one server source of truth.
- Preserve `/api/time/active` and `cubicle:timer-changed` compatibility.
- Add cross-tab sync via `BroadcastChannel` or storage event if needed.
- Fixed Price cannot be selected or assigned through crafted requests.

## 7. Billing-Aware Project Workflows

### Harga Tetap

```text
Project
├── Scope
├── One-time Tasks
├── Milestones
├── Files/Deliverables
└── Invoices
```

No:

- Timer.
- Manual time.
- Weekly time.
- Time approval.
- Time report.
- Time-based invoice.
- Time data in client portal.

Project detail focuses on:

- fixed amount;
- deadline;
- completion progress;
- deliverables;
- milestone status;
- approval state;
- invoice/payment state.

### Per Jam

```text
Project
├── Recurring Tasks
├── Time Logs
└── Hourly Invoices
```

- Task lifecycle: Active/Archived.
- New time requires Project+Task.
- Member time requires weekly approval.
- Owner own-time auto-approved.
- Invoice imports approved, uninvoiced time only.
- Prevent double billing transactionally.

### Retainer

```text
Project
├── Recurring Tasks
├── Time Logs
├── Period Capacity
└── Recurring Fee + Overage Invoice
```

Required configuration:

- recurring fee;
- included hours;
- period;
- reset date;
- overage policy/rate;
- timezone.

Usage:

- draft usage may appear internally as provisional;
- approved usage is final;
- client sees approved/invoiced proof only;
- periods are immutable snapshots;
- reset creates a new period, never erases history.

## 8. Server Invariants

A UI filter is insufficient. Enforce in all server write paths.

### Fixed Price rejection points

- `startTimer`.
- `startTimerFromTask`.
- `createManualEntry`.
- `setWeeklyTimeCell` or replacement weekly mutation.
- `updateActiveTimerMetadata`.
- `stopTimer` retargeting.
- `updateTimeEntry`.
- invoice `importTimeEntries`.

### Time context authority

Server resolves:

```text
Task → Project → Client → Billing model
```

Validate:

- same workspace;
- user access;
- project active;
- billing model allows time;
- task belongs to Project;
- task active and recurring;
- no submitted/approved/invoiced mutation without reversal rights.

### Effective work date

Use one helper everywhere:

```text
manual duration → workDate
live timer      → startTime converted to workspace/user date
```

Must drive:

- Daily history.
- Weekly history.
- Submission totals.
- Approval locking.
- Edit/delete lock.
- Retainer period usage.
- Reports/export.

## 9. Known Current Bugs to Fix During Cutover

1. Manual duration entries can disappear from current history because query requires `endTime IS NOT NULL`.
2. Manual duration entries can be excluded from approval because approval filters `startTime` instead of effective work date.
3. Weekly grid uses fake timer timestamps for manual cells, creating two manual-entry representations.
4. Current history is workspace-wide instead of current-user scoped.
5. Current query limits 200 before date filtering.
6. Current Fixed Price can still track internal time.
7. Current weekly grouping is Project+Activity.
8. Current approval edit lock may use `createdAt` instead of `workDate`.
9. Current owner approval note state may be shared across rows.
10. Current portal can query task-linked time for Fixed Price projects.
11. Current Package semantics do not reliably equal Retainer.
12. Current date handling mixes UTC and local timezone.

## 10. Data Migration Strategy

### Never delete first

Initial releases hide/freeze writes while preserving reads.

### Classification

Classify every legacy Package project:

- recurring hours allowance → candidate Retainer;
- one-off bundled outcome → Fixed Price;
- unclear/contradictory → manual review.

Classify Fixed Price time:

- open timer;
- draft/uninvoiced;
- submitted;
- approved;
- invoiced;
- internal historical.

Historical records remain readable. No automatic destructive deletion.

### Compatibility release order

1. Deploy target policies and UI guards.
2. Freeze Package/Activity/Service writes.
3. Exclude Fixed Price from new time writes.
4. Add additive target schema and classification markers.
5. Backfill unambiguous records.
6. Manually resolve ambiguous records.
7. Cut over reports/portal/invoice reads.
8. Reconcile totals and historical documents.
9. Remove obsolete foreign-key dependencies.
10. Drop Package/Activity tables only after backup and explicit final approval.

Service tables remain until proposal, invoice, project snapshot, task, portal, and profitability dependencies have a safe replacement.

## 11. Implementation Phases

### Phase 0 — Baseline, audit, and safety gates

- Preserve clean `dev/integration` baseline.
- Create feature branch/worktree.
- Record current dev DB counts and relationships.
- Add preflight queries for Package ambiguity and Fixed Price time.
- Add negative server-policy tests.
- No destructive migration.

**Exit gate:** inventory and classification report complete.

### Phase 1 — Waktu page UX

- Replace root `/app/time` with history-first page.
- Add Harian/Mingguan toggle and date navigation.
- Add two dialogs.
- Project→Task cascade.
- Compact active timer card.
- Remove permanent timer form, KPI/filter/pagination block, and old Time tabs.
- Compatibility redirects.

**Exit gate:** authenticated desktop/mobile browser QA passes.

### Phase 2 — Time correctness and approval

- Introduce effective-work-date helper.
- Fix manual duration history and weekly approval.
- User/date-scoped DB queries.
- Replace Project+Activity weekly grouping with Project+Task.
- Move approval context into Weekly view.
- Owner own-time auto-approval.
- Approved/invoiced edit protections.

**Exit gate:** manual and timer entries reconcile across Daily, Weekly, approval, reports.

### Phase 3 — Billing policy enforcement

- Central billing-model helper.
- Fixed Price time mutation hard guard.
- Hide/freeze Package, Activity, Service routes/actions.
- Remove Activity from all new write payloads.
- Enforce Task requirement for Hourly/Retainer.

**Exit gate:** crafted server-action requests cannot create Fixed Price time.

### Phase 4 — Project and Task UX

- Contextual project creation: Harga Tetap/Per Jam/Retainer.
- Fixed Price one-time task UI.
- Hourly/Retainer recurring task UI.
- Block unsafe billing-model changes after transactional data.
- Remove Package/Service/Activity controls.

**Exit gate:** all three project types create with only relevant fields.

### Phase 5 — Fixed Price outcomes

- Scope/deliverable presentation.
- Milestone model and actions.
- Milestone/fixed-value invoice path.
- Fixed Price client portal without time data.

**Exit gate:** Fixed Price full flow works without any time surface.

### Phase 6 — Hourly billing integrity

- Approved uninvoiced-time selection.
- Task/user/date/description proof.
- Transactional anti-double-billing.
- Exact reversal rules for draft invoices.
- Client-safe approved/invoiced time presentation.

**Exit gate:** same entry cannot be invoiced twice.

### Phase 7 — Retainer periods

- Retainer period snapshots.
- Included/used/remaining/overage calculation.
- Reset logic.
- Recurring fee/overage invoice generation.
- Idempotent cron.
- Retainer portal presentation.

**Exit gate:** reset and retry never erase history or duplicate invoice.

### Phase 8 — Legacy migration and cleanup

- Backfill approved classifications.
- Preserve historical snapshots.
- Resolve pending package orders/requests.
- Cut over portal/report/export/invoice reads.
- Remove obsolete schema only after reconciliation and backup.

**Exit gate:** no ambiguous records, orphan FKs, or total mismatches.

### Phase 9 — Release QA

- Lint.
- Typecheck.
- Full unit/integration tests.
- Production build.
- Mutation E2E.
- Browser E2E.
- Desktop 1440, tablet 768, mobile 390/375.
- Owner/member/viewer/client roles.
- DB reconciliation.
- Dev image revision/health proof.
- Production unchanged.

## 12. Required Tests

### Time UX

- Daily selects by effective work date.
- Weekly spans month/year/timezone correctly.
- Manual entry appears immediately.
- Fixed Price absent from selectors.
- Project filters Task correctly.
- Task from another Project rejected.
- Activity absent.
- Dialog success closes and refreshes history.
- Start updates active card and topbar.
- Pause/resume/stop sync.
- No horizontal overflow.

### Approval

- Member submits selected week.
- Manual and timer entries included.
- Submitted week locked.
- Owner approve/reject.
- Rejected week editable again.
- Owner own entry auto-approved.
- Approval notes isolated per submission.

### Billing

- Fixed Price rejects every time mutation.
- Fixed Price invoice uses agreed amount/milestone only.
- Hourly invoice imports approved time only.
- Same time cannot invoice twice.
- Retainer usage uses selected period only.
- Retainer reset creates new period.
- Recurring invoice generation is idempotent.

### Portal

- Fixed Price contains no time/rate/usage UI or payload.
- Hourly proof contains approved/invoiced Task, description, user, duration, date.
- Retainer shows current period capacity and approved proof.
- Internal/hidden Task data excluded.

### Compatibility

- Historical Package, Activity, Service, invoice, and time records remain readable.
- Old Time URLs redirect safely.
- Existing sent/paid invoice documents do not change.

## 13. Definition of Done

A phase is done only when:

- code and migration are complete;
- server invariants are tested;
- lint/typecheck/tests/build pass;
- browser behavior is exercised;
- DB result is verified;
- docs/changelog are updated;
- commit is pushed;
- dev deployment revision matches source;
- dev health is OK;
- production remains untouched.

## 14. Explicit Non-goals

- Employee surveillance.
- GPS, screenshot monitoring, attendance, payroll HR.
- Native mobile app.
- Replacing Package with another catalog abstraction.
- Reintroducing Activity under another label.
- Making Service catalog primary UX.
- Client approval for each time entry.
- Multi-level approval.
- Showing Fixed Price internal effort to clients.

## 15. Canonical Summary

```text
Package                 → remove from product; migrate safely
Activity                → remove from product; migrate safely
Service catalog         → hide; preserve snapshots until dependencies cut over
Harga Tetap             → outcome, Task, milestone, file, invoice; no time
Per Jam                 → recurring Task, approved time, hourly invoice
Retainer                → recurring Task, approved time, period quota, recurring invoice
Waktu page              → history-first
Waktu views             → Harian | Mingguan
Waktu actions           → Catat Waktu | Mulai Timer
Time input              → Project → Task → Description
Client                  → inferred from Project
Approval                → contextual weekly team flow
Solo owner time         → auto-approved
Member time             → weekly owner approval
Client-visible time     → approved/invoiced only
Production              → hold until explicit approval
```
