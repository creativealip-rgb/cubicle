# Billing-Aware Project Tasks and Templates Design

**Status:** Approved product decisions, awaiting written-spec review  
**Date:** 2026-07-31  
**Project:** Cubiqlo

## 1. Goal

Simplify Cubiqlo work management into billing-aware project Tasks, flat Task Templates, and clear Time Logs:

- Fixed Price projects default to finite workflow tasks.
- Hourly and Retainer projects default to reusable tasks for time tracking.
- Templates are import-only collections; template names do not create parent groups in projects.
- Activity and Service UI are retired gradually after production reconciliation.

## 2. Canonical terminology

| Concept | Indonesian UI | Meaning |
|---|---|---|
| Project task | Tugas | Work item attached directly to one project |
| Task template | Template Tugas | Reusable collection of task definitions for import |
| Project work tab | Pekerjaan | Project-detail tab containing billing-aware task editor |
| Time entry | Entri Waktu | One logged work-duration record |
| Time module | Waktu | Timer, manual logging, history, weekly view, approvals |
| Billing tab | Billing | Project commercial summary and related invoices |

Deprecated from active UI:

- Aktivitas Berulang
- Activity catalog / Aktivitas as a time classifier
- Layanan as a standalone project-detail tab
- Task List as a persistent parent/group inside a project

“Task List” may remain in historical documentation or migration notes, but new UI and schema use flat project Tasks plus Template Tugas.

## 3. Project task modes

Billing determines the default task mode, not an irreversible restriction.

### 3.1 Fixed Price default: workflow tasks

Purpose: finish defined deliverables.

Fields and behavior:

- title and optional description
- workflow status: `todo`, `in_progress`, `review`, `done`
- priority
- assignee
- due date
- client visibility
- explicit order
- List and Board views
- project progress may use completed-task ratio

### 3.2 Hourly / Retainer default: reusable tasks

Purpose: classify repeatable work selected by Time Logs.

Fields and behavior:

- title and optional description
- lifecycle: `active` or `archived`
- optional default assignee as responsible person
- explicit order
- tracked hours summary
- last-used timestamp derived from Time Logs
- flat list only; no Board

Not used:

- workflow completion status
- due date
- priority
- completion percentage
- automatic recurrence or scheduling

A reusable task remains available while active. Archiving prevents new selection but preserves historical Time Logs.

### 3.3 Flexible override

Defaults:

| Billing model | Default mode |
|---|---|
| Fixed Price | Workflow |
| Hourly | Reusable |
| Retainer | Reusable |
| Legacy Package | Read-only until classified |

A project may explicitly switch or add the other work mode when its real workflow requires it. Mixed mode must be enabled by a deliberate user action; both editors are not shown by default.

Transitions must preserve historical tasks and Time Logs. No transition may silently reinterpret an existing task’s lifecycle.

## 4. Flat project task structure

A project has one flat set of Tasks. There is no persistent Task List parent and no subtask in this scope.

Example after importing two templates:

```text
Project: Website Maintenance
- Frontend development
- Backend development
- QA
- Deployment
- Bug fixing
- Update content
- Monthly report
```

Template names such as “Website Development” or “Website Support” do not appear as project groups.

## 5. Task Templates

### 5.1 Template model

A Template Tugas contains:

- workspace ownership
- name
- optional description
- target: `fixed_price`, `hourly_retainer`, or `all`
- status: `active` or `archived`
- ordered template items

Each item contains:

- title
- optional description
- optional default assignee
- position
- mode-relevant defaults where applicable

### 5.2 Import semantics

Import flow:

1. Select one project.
2. Select one or more compatible templates.
3. Show merged preview grouped by source template only during preview.
4. Allow per-item selection.
5. Detect project duplicates case-insensitively after trimming whitespace.
6. Default duplicate action to **Lewati**.
7. Allow **Tetap tambahkan** per duplicate.
8. Copy selected items into the project in one transaction.
9. Append imported positions after existing project Tasks while preserving selected template order.

After import:

- Project tasks are independent copies.
- Template edits never mutate existing project tasks.
- Project edits never mutate templates.
- Template name and template ID are not required in active project UX. Optional provenance may be stored for audit only.

### 5.3 Billing adaptation

For a Fixed Price project, imported tasks receive workflow defaults:

- status `todo`
- priority `medium`
- no due date unless supplied explicitly

For Hourly / Retainer, imported tasks receive reusable defaults:

- lifecycle `active`
- no workflow status, due date, or priority in active UX

Templates with incompatible targets are hidden by default. A clear override may expose them, but import preview must state how fields will adapt.

## 6. UI architecture

### 6.1 Global Tasks page

Tabs:

```text
Tugas Proyek | Template Tugas
```

`Tugas Proyek` supports complete editing:

- project/client/billing/assignee/status filters
- search
- billing-aware rows
- Fixed Price List/Board
- Hourly / Retainer reusable list
- create, edit, archive, reorder, and template import
- maximum 10 rows per page for global lists

`Template Tugas` supports:

- create, rename, duplicate, archive
- add/edit/remove/reorder template items
- target selection
- multi-template import to one project

### 6.2 Project detail

Canonical tabs:

```text
Ringkasan | Pekerjaan | Waktu? | File | Billing
```

- `Pekerjaan` renders complete task editing scoped to the project.
- Fixed Price defaults to workflow List/Board.
- Hourly / Retainer defaults to reusable task list.
- `Waktu` appears for active Hourly / Retainer tracking and for readable historical Time Logs.
- `Billing` contains billing model/rate/budget/retainer allowance plus related invoices.
- Standalone `Layanan` tab is hidden.

Global and project-detail editors use shared actions and reusable components. They must not become separate writable implementations.

### 6.3 Ordering and accessibility

- Desktop supports drag-and-drop.
- Mobile and keyboard users get Move Up / Move Down controls.
- Reordering is workspace- and project-scoped.
- Position updates are transactional and collision-safe.
- All controls meet accessible-name and touch-target requirements.

## 7. Time Log integration

New active flow:

```text
Project → Task → Description → Date/Duration → Approval
```

Rules:

- Task is required for new Hourly / Retainer timer completion and manual Time Logs.
- Historical Time Logs without a task remain readable.
- Members with project/workspace write access may log time against a reusable Task even when they are not its default assignee.
- Default assignee represents responsibility, not exclusive logging permission.
- Archived Tasks cannot be selected for new Time Logs.
- Historical entries keep task label and relationship after task archival.
- Fixed Price time tracking remains off by default; historical Fixed Price entries remain readable.

Reports aggregate new Time Logs by client, project, task, and user. Activity is not required for new reporting.

## 8. Activity retirement

Repository evidence already includes a Phase 9 cleanup design and migration draft. Production cleanup remains gated.

### 8.1 Immediate non-destructive phase

- Remove Activity navigation and active UI routes.
- Remove Activity selectors from timer, manual entry, Time Log editor, filters, and new reports.
- Stop creating or updating Activity assignments.
- Preserve compatibility reads for historical rows until production audit passes.

### 8.2 Production reconciliation gate

Measure on the serving production database:

- Activity catalog rows
- project-activity links
- Time Logs with `activity_id`
- reports or invoices dependent on Activity
- runtime schema/migration state

Require:

- fresh backup
- reconciliation artifact
- explicit DB cleanup approval
- disposable clone migration proof
- rollback/recovery procedure

Only then may migration cleanup remove `time_entries.activity_id`, `project_activities`, and `activities`.

## 9. Service retirement

Standalone Service/Layanan UI is hidden because Project billing is the canonical commercial source for current Cubiqlo scope.

Project billing stores:

- billing model
- fixed budget
- hourly rate
- Retainer fee and included hours
- currency

Proposal, contract, and invoice snapshots remain authoritative for their documents.

Service schema/data is compatibility-read until a separate production audit verifies it is safe to remove or retain. This design does not authorize destructive Service migration.

## 10. Billing tab

One project-detail `Billing` tab contains:

- billing-model summary
- Fixed Price budget, Hourly rate, or Retainer fee/allowance
- currency
- tracked/billable usage where relevant
- related invoices
- invoice creation/view actions

No standalone `Layanan` tab remains in active project navigation.

## 11. Data integrity and authorization

All reads/writes require workspace membership and project scoping.

Required invariants:

- task and template rows belong to one workspace
- project tasks must match project workspace
- template import validates destination project and every default assignee
- archived templates cannot be newly imported without explicit restore
- task hard delete is forbidden when referenced by Time Logs
- duplicate detection is advisory and previewed; server repeats it inside transaction
- imports are atomic and idempotency-protected against accidental double submit
- tenant IDs are never trusted directly from client payload

## 12. Migration strategy

Additive first:

1. Add Template Tugas tables and target/status constraints.
2. Add fields needed to distinguish workflow and reusable task lifecycle without destroying existing rows.
3. Classify existing `behavior=recurring` tasks as reusable candidates.
4. Reconcile edge cases and legacy billing projects.
5. Switch UI/actions to canonical modes.
6. Retire Activity/Service UI.
7. Perform destructive cleanup only through separately approved migrations.

Existing task/time relationships must remain stable. No migration may rewrite historical Time Logs to a different task automatically.

## 13. Testing and verification

### Automated

- billing default and explicit override tests
- workflow vs reusable field validation
- template target filtering
- multi-template flat import
- order preservation
- duplicate preview and server transaction checks
- import idempotency
- workspace/project/assignee tenant boundaries
- archived task selection rejection
- historical taskless and Activity-linked Time Log reads
- billing-model transition compatibility
- global/detail shared editor wiring
- drag and move-button ordering
- reports grouped by task without Activity

### Browser QA

Desktop and 390×844 mobile:

- Fixed Price project Pekerjaan List/Board
- Hourly project reusable list
- Retainer usage and reusable list
- global complete editor
- project-detail complete editor
- create/edit/archive/reorder
- multi-template preview/import
- duplicate handling
- Time Log task requirement
- historical empty-task rendering
- Billing tab and related invoices
- no Activity or standalone Layanan navigation
- no horizontal overflow, console errors, or inaccessible controls

### Release gates

- targeted tests pass
- full Vitest suite passes
- ESLint passes
- TypeScript and Next.js production build pass
- migration dry-run passes on disposable clone
- authenticated live/mobile QA passes
- `dokploy-traefik` remains sole public 80/443 owner

## 14. Explicitly out of scope

- subtasks
- persistent Task List/group hierarchy
- automatic recurring schedules
- cron-generated task occurrences
- template-to-project synchronization after import
- exclusive logging permission based on default assignee
- destructive production Activity or Service cleanup without separate approval

## 15. Approved decisions

- **A:** Use all recommended labels.
- **B:** Billing provides a flexible default.
- **C:** Templates have a billing target.
- **D:** Import preview defaults duplicates to skip and offers “Tetap tambahkan”.
- **E:** Task required for new Hourly/Retainer Time Logs; historical taskless entries remain readable.
- **F:** Assignee is default responsibility; other authorized members may log time.
- **G:** Audit, then staged cleanup.
- **H:** One Billing tab with summary and related invoices.
- **I:** No subtasks now.
- **J:** Drag-and-drop desktop plus move controls for mobile/accessibility.
- Full editors exist globally and in project detail.
- Template application is one-time copy; project and template are independent afterward.
- Imported tasks are flat; source template names do not become project groups.
