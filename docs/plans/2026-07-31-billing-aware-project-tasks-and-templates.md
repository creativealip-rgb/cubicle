# Billing-Aware Project Tasks and Templates Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the ambiguous one-time/recurring task UX with billing-aware flat project Tasks, import-only Task Templates, task-required Hourly/Retainer Time Logs, and staged Activity/Service UI retirement.

**Architecture:** Keep `tasks` as the canonical project-work table and add an explicit task mode/lifecycle plus workspace-owned template tables. Build one shared project-task workspace rendered in global and project-detail contexts. Ship additive schema and compatibility reads first; do not run destructive Activity/Service cleanup in this implementation phase.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL 16, Drizzle ORM, Zod, Vitest, Tailwind/shadcn, dnd-kit.

**Canonical spec:** `docs/superpowers/specs/2026-07-31-billing-aware-project-tasks-and-templates-design.md`

**Baseline:** `main` at `7d2ee26d42cf9eba153026e14d0882f2ae329260` or newer fast-forward descendant.

---

## Safety boundaries

1. This plan uses additive migrations only.
2. Do not apply `drizzle/0062_billing_aware_phase9_cleanup.sql` to production.
3. Do not drop `activities`, `project_activities`, `services`, `project_services`, or `time_entries.activity_id` in this phase.
4. Existing Time Logs without tasks and with legacy Activity links remain readable.
5. Before any VPS deploy, read `DEPLOYMENT_GUARDRAILS.md` and `DEPLOY_RULES.md`, then run `PRE_DEPLOY_CHECK.sh`.
6. Production database migration requires backup, disposable-clone rehearsal, exact migration verification, and explicit deploy approval.

## Schema decisions

### Existing `tasks`

Add:

```text
mode: workflow | reusable
lifecycle: active | archived
template_item_source_id: nullable UUID (audit only; no synchronization)
```

Keep compatibility fields:

```text
behavior
status
priority
due_date
archived_at
```

Classification:

```text
behavior=one_time  -> mode=workflow
behavior=recurring -> mode=reusable
null behavior      -> resolve from project billing model
```

`mode` becomes canonical after backfill. `behavior` remains compatibility-read until a later cleanup.

### New template tables

```text
task_templates
- id UUID PK
- workspace_id UUID NOT NULL
- name TEXT NOT NULL
- description TEXT NULL
- target TEXT: fixed_price | hourly_retainer | all
- status TEXT: active | archived
- created_by TEXT NULL
- timestamps
- unique active normalized name per workspace

task_template_items
- id UUID PK
- workspace_id UUID NOT NULL
- template_id UUID NOT NULL
- title TEXT NOT NULL
- description TEXT NULL
- default_assignee_id TEXT NULL
- position INTEGER NOT NULL
- timestamps
- composite tenant FKs
- unique(template_id, position)
```

No persistent Task List/group table. No subtask table.

---

### Task 1: Add pure task-mode and template-import policies

**Objective:** Define billing defaults, lifecycle behavior, normalization, duplicate detection, and flat import decisions as pure tested functions.

**Files:**
- Create: `src/lib/task-work-mode.ts`
- Create: `src/lib/task-work-mode.test.ts`
- Create: `src/lib/task-template-import.ts`
- Create: `src/lib/task-template-import.test.ts`

**Step 1: Write failing tests**

Cover:

```text
fixed_price -> workflow
hourly/retainer -> reusable
explicit override wins
legacy_package rejects new writes
normalized duplicate compares trim + lowercase
preview defaults duplicate to skip
keep override includes duplicate
selected items preserve template and item order
workflow import defaults todo/medium
reusable import defaults active lifecycle
```

**Step 2: Verify RED**

Run:

```bash
docker run --rm -v "$PWD":/work -w /work node:22.23.1-bookworm-slim \
  sh -lc 'npm run test -- src/lib/task-work-mode.test.ts src/lib/task-template-import.test.ts'
```

Expected: FAIL because modules/exports do not exist.

**Step 3: Implement minimal pure policies**

Exports:

```ts
export type TaskWorkMode = "workflow" | "reusable";
export type TaskLifecycle = "active" | "archived";
export function defaultTaskWorkMode(model: BillingModel): TaskWorkMode;
export function resolveTaskWorkMode(model: BillingModel, override?: TaskWorkMode): TaskWorkMode;
export function normalizeTaskTitle(value: string): string;
export function previewTemplateImport(...): ImportPreviewItem[];
export function projectTaskDefaults(mode: TaskWorkMode): ...;
```

No DB or UI imports.

**Step 4: Verify GREEN**

Run targeted tests. Expected: all pass.

**Step 5: Commit**

```bash
git add src/lib/task-work-mode.ts src/lib/task-work-mode.test.ts src/lib/task-template-import.ts src/lib/task-template-import.test.ts
git commit -m "feat(tasks): add billing-aware task policies"
```

---

### Task 2: Add additive task-template schema and migration

**Objective:** Add canonical task mode/lifecycle and flat template storage without removing legacy schema.

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0064_billing_aware_task_templates.sql`
- Modify: `docs/migration-registry.md`
- Create: `src/lib/task-template-schema-wiring.test.ts`

**Step 1: Write failing schema test**

Assert stable contracts:

```text
tasks.mode enum workflow/reusable
tasks.lifecycle enum active/archived
taskTemplates export
taskTemplateItems export
workspace composite FKs
normalized active-name unique index
template target/status checks
position non-negative check
migration contains additive ALTER/CREATE only
migration does not DROP Activity/Service objects
```

**Step 2: Verify RED**

Run the new test. Expected: FAIL on missing schema exports/migration.

**Step 3: Implement schema and migration**

Migration order:

1. Add nullable `tasks.mode`.
2. Add non-null `tasks.lifecycle DEFAULT 'active'`.
3. Add nullable `tasks.template_item_source_id` without FK to allow template deletion/archive independence, or use `ON DELETE SET NULL` if FK retained.
4. Create template tables and constraints.
5. Backfill task mode from `behavior`, then project billing model/type.
6. Make `tasks.mode` non-null after reconciliation query confirms no nulls.
7. Add indexes for global/project mode/lifecycle/order queries.

Backfill must map legacy package tasks conservatively and document result.

**Step 4: Verify migration statically and on disposable DB**

Use a disposable PostgreSQL database/container. Apply baseline migrations/schema then `0064`. Verify tables, columns, constraints, and backfill. Do not touch production.

**Step 5: Run schema test and build**

Expected: test passes; TypeScript build passes.

**Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/0064_billing_aware_task_templates.sql docs/migration-registry.md src/lib/task-template-schema-wiring.test.ts
git commit -m "feat(tasks): add task template schema"
```

---

### Task 3: Implement tenant-safe template CRUD

**Objective:** Provide workspace-scoped create/update/archive/duplicate and item editing actions.

**Files:**
- Create: `src/lib/actions/task-templates.ts`
- Create: `src/lib/task-template-actions-wiring.test.ts`
- Modify: `src/lib/access.ts` only if a shared assertion is needed

**Step 1: Write failing tests**

Assert:

```text
getTaskTemplates
createTaskTemplate
updateTaskTemplate
archiveTaskTemplate
duplicateTaskTemplate
createTaskTemplateItem
updateTaskTemplateItem
removeTaskTemplateItem
reorderTaskTemplateItems
assertWorkspaceWritable
workspace-scoped predicates
assignee membership validation
transaction for duplicate/reorder
archived template write guard
```

Add pure validation tests for target/status/title/position.

**Step 2: Verify RED**

Expected: missing action module/exports.

**Step 3: Implement minimal actions**

Rules:

- Never trust client workspace ID.
- Resolve active workspace from session.
- Validate default assignee membership.
- Archive, do not hard-delete template.
- Item removal allowed because templates are import sources, not historical project relations; still scope transactionally.
- Duplicate copies items and creates collision-safe name such as `Nama (Salinan)`.
- Reorder accepts complete ordered IDs, validates same template/workspace, and updates in one transaction.

**Step 4: Verify GREEN and build**

Run targeted tests and `npm run build`.

**Step 5: Commit**

```bash
git add src/lib/actions/task-templates.ts src/lib/task-template-actions-wiring.test.ts src/lib/access.ts
git commit -m "feat(tasks): add task template actions"
```

---

### Task 4: Implement atomic multi-template preview and import

**Objective:** Import selected template items as flat project tasks with duplicate decisions and idempotency protection.

**Files:**
- Modify: `src/lib/actions/task-templates.ts`
- Create: `src/lib/task-template-import-actions.test.ts`
- Create: `src/lib/task-template-import-wiring.test.ts`

**Step 1: Write failing tests**

Behavior tests should cover:

```text
preview groups only for display
resulting project tasks have no parent group
multiple templates append flat tasks
trim/case duplicate detection
duplicate defaults skip
explicit keep creates duplicate
incompatible target rejected unless override=true
project billing determines task mode/defaults
assignee outside workspace rejected
archived template rejected
idempotency key prevents double import
positions append after existing max and preserve selection order
transaction rollback on any invalid item
```

**Step 2: Verify RED**

Expected: missing preview/import actions.

**Step 3: Implement**

Exports:

```ts
previewTaskTemplateImport(input)
importTaskTemplates(input)
```

Server repeats all preview validations inside import transaction. Store idempotency in a small import ledger table only if current infrastructure lacks reusable idempotency storage; if added, update Task 2 migration before continuing.

**Step 4: Verify GREEN**

Run pure/action/wiring tests and build.

**Step 5: Commit**

```bash
git add src/lib/actions/task-templates.ts src/lib/task-template-import-actions.test.ts src/lib/task-template-import-wiring.test.ts
git commit -m "feat(tasks): import flat task templates"
```

---

### Task 5: Harden project task actions for workflow/reusable modes

**Objective:** Make create/update/archive/reorder behavior enforce mode-specific server invariants.

**Files:**
- Modify: `src/lib/actions/tasks.ts`
- Modify: `src/lib/billing-model.ts` only to deprecate old behavior helper usage
- Create: `src/lib/billing-aware-task-actions.test.ts`
- Update: superseded task behavior wiring tests

**Step 1: Write failing tests**

Required server rules:

```text
workflow allows status/priority/due/client visibility
reusable ignores or rejects workflow-only mutation fields
reusable lifecycle active/archived
archived reusable task cannot return in active Time selector without restore
hard delete blocked when Time Logs reference task
unreferenced task delete may remain or become archive-only by mode
reorder validates workspace/project/mode and complete ordered IDs
explicit project mode override required for non-default mode
portal review only accepts workflow tasks
```

**Step 2: Verify RED**

Run targeted suite. Ensure failures reflect missing canonical mode/lifecycle enforcement.

**Step 3: Implement minimal guards**

- Replace `behavior` as active source with `mode`.
- Preserve compatibility writes only where migration transition requires them.
- Add `archiveTask` and `restoreTask`.
- Change reusable deletion to archive when referenced.
- Keep notification behavior for default assignee but do not restrict Time Log permission to assignee.
- Scope every update predicate by task ID + workspace where practical after access assertion.

**Step 4: Update superseded tests deliberately**

Remove only old UI/behavior-label assumptions. Preserve tenant, portal, notification, and historical guarantees.

**Step 5: Verify GREEN and full task tests**

Run all task-related suites plus build.

**Step 6: Commit**

```bash
git add src/lib/actions/tasks.ts src/lib/billing-model.ts src/lib/*task*.test.ts
git commit -m "feat(tasks): enforce billing-aware task modes"
```

---

### Task 6: Build shared billing-aware project task workspace

**Objective:** Create one complete editor component reusable globally and inside project detail.

**Files:**
- Create: `src/components/tasks/project-task-workspace.tsx`
- Create: `src/components/tasks/workflow-task-workspace.tsx`
- Create: `src/components/tasks/reusable-task-workspace.tsx`
- Create: `src/components/tasks/task-template-import-dialog.tsx`
- Modify: existing `tasks-list-table.tsx`, `tasks-board-view.tsx`, `task-form.tsx` as shared children
- Create: `src/lib/project-task-workspace-wiring.test.ts`

**Step 1: Write failing wiring/component tests**

Assert:

```text
shared ProjectTaskWorkspace export
projectId optional for global/detail mode
workflow renders List/Board
reusable renders flat list only
reusable fields exclude status/due/priority
create/edit/archive/reorder actions wired
import dialog wired
10/page global pagination
full editor available in both contexts
```

**Step 2: Verify RED**

Expected: missing components.

**Step 3: Implement shared components**

UI requirements:

- premium compact table/list, not card grid
- billing/mode badge
- reusable row: title, project/client in global mode, default assignee, month hours, last used, lifecycle
- desktop drag handle via existing dnd-kit
- accessible Move Up/Move Down menu/buttons on mobile and keyboard
- explicit restore for archived tasks
- no “Aktivitas Berulang” copy

**Step 4: Verify GREEN, lint, build**

Run targeted test, ESLint, and build.

**Step 5: Commit**

```bash
git add src/components/tasks src/lib/project-task-workspace-wiring.test.ts
git commit -m "feat(tasks): add shared project task workspace"
```

---

### Task 7: Replace global Tasks page UX

**Objective:** Change `/app/tasks` to `Tugas Proyek | Template Tugas` with complete editors.

**Files:**
- Modify: `src/app/(app)/app/tasks/page.tsx`
- Create: `src/components/tasks/task-page-tabs.tsx`
- Create: `src/components/tasks/task-template-workspace.tsx`
- Remove active use of: `src/components/tasks/task-behavior-tabs.tsx`
- Update: navigation/filter/task wiring tests
- Create: `src/lib/global-task-page-wiring.test.ts`

**Step 1: Write failing test**

Assert new labels/components and absence of active `Semua / Sekali selesai / Aktivitas berulang` behavior tabs.

**Step 2: Verify RED**

Expected: current page still renders `TaskBehaviorTabs`.

**Step 3: Implement**

- URL tab state: `?tab=tasks|templates`.
- Preserve task filters and focus deep link.
- Add template target/status/search/pagination.
- Complete create/edit/archive/duplicate/item/reorder/import flows.
- Keep max 10 rows/page.

**Step 4: Verify GREEN, lint, build**

**Step 5: Commit**

```bash
git add 'src/app/(app)/app/tasks/page.tsx' src/components/tasks src/lib/global-task-page-wiring.test.ts
git commit -m "feat(tasks): redesign global task page"
```

---

### Task 8: Replace project-detail work tab and consolidate Billing

**Objective:** Render billing-aware `Pekerjaan`, conditionally show `Waktu`, hide standalone `Layanan`, and provide one Billing tab.

**Files:**
- Modify: `src/app/(app)/app/projects/[projectId]/page.tsx`
- Create: `src/components/projects/project-billing-tab.tsx`
- Reuse: `src/components/tasks/project-task-workspace.tsx`
- Update: project detail/service catalog wiring tests
- Create: `src/lib/project-detail-work-billing-wiring.test.ts`

**Step 1: Write failing test**

Assert:

```text
Pekerjaan tab renders ProjectTaskWorkspace
Waktu conditional contract preserved
Billing tab exists
Billing shows project commercial summary + related invoices
standalone Layanan tab absent
ProjectServiceSettings absent from active project page
historical service data actions remain untouched
```

**Step 2: Verify RED**

Expected: current page has Tasks/Files/Layanan/Time.

**Step 3: Implement**

- Query billing summary and related invoices tenant-safely.
- Keep Service compatibility backend untouched.
- Fixed Price default workspace workflow.
- Hourly/Retainer default reusable.
- Do not show two work modes until explicit override exists.

**Step 4: Verify GREEN, lint, build**

**Step 5: Commit**

```bash
git add 'src/app/(app)/app/projects/[projectId]/page.tsx' src/components/projects/project-billing-tab.tsx src/lib/project-detail-work-billing-wiring.test.ts
git commit -m "feat(projects): add billing-aware work and billing tabs"
```

---

### Task 9: Require Tasks for new Hourly/Retainer Time Logs

**Objective:** Remove Activity from active Time UI and require an active project Task for new Hourly/Retainer logs while preserving historical reads.

**Files:**
- Modify: `src/lib/actions/time.ts`
- Modify: `src/components/time/time-route-content.tsx`
- Modify: `src/components/time/timer-widget.tsx`
- Modify: `src/components/time/timesheet.tsx`
- Modify: `src/app/api/time/active/route.ts`
- Modify relevant manual/timer dialogs
- Update time wiring and policy tests
- Create: `src/lib/time-task-requirement.test.ts`

**Step 1: Write failing tests**

Matrix:

```text
Hourly manual without task -> reject
Retainer manual without task -> reject
Hourly timer completion without task -> reject
Retainer timer completion without task -> reject
active reusable task -> allow
archived task -> reject
foreign-project task -> reject
foreign-workspace task -> reject
non-assignee authorized member -> allow
historical taskless read -> allow
historical Activity-linked read -> allow
Fixed Price active time write -> existing billing guard remains
```

**Step 2: Verify RED**

Current schemas permit optional `taskId`; expected failures.

**Step 3: Implement server guard first**

Create/reuse `assertTimeTaskEligible`:

- resolve project billing model
- require task for Hourly/Retainer new writes/completion
- validate task workspace/project/mode/lifecycle
- do not require assignee equality
- preserve update/read compatibility for historical rows unless changing project/task context

**Step 4: Remove Activity from active UI**

- no Activity selector/options
- no Activity route link
- do not pass `activities` into new editors
- historical `activityName` may remain in compatibility display only until DB cleanup

**Step 5: Verify targeted matrix and build**

**Step 6: Commit**

```bash
git add src/lib/actions/time.ts src/components/time 'src/app/api/time/active/route.ts' src/lib/*time*.test.ts
git commit -m "feat(time): require project tasks for billable logs"
```

---

### Task 10: Hide Activity and Service active navigation without destructive cleanup

**Objective:** Retire confusing active UI while retaining backend/schema compatibility.

**Files:**
- Modify: `src/lib/navigation/app-navigation.ts`
- Modify/redirect: `src/app/(app)/app/time/activities/page.tsx`
- Modify/redirect: `src/app/(app)/app/services/page.tsx`
- Keep compatibility action files and schema exports
- Create: `src/lib/legacy-activity-service-ui-retirement.test.ts`
- Modify: `docs/migration-registry.md`

**Step 1: Write failing test**

Assert:

```text
navigation has no Activity/Service direct entry
legacy routes redirect to canonical Tasks/Time/Billing destination
schema still exports legacy objects
0062 remains unapplied/retired or explicitly gated
compatibility reads remain
```

**Step 2: Verify RED**

Expected: active routes still render catalogs.

**Step 3: Implement non-destructive retirement**

- Use redirect pages, not deletion, for bookmarked URLs.
- Keep actions fail-closed as currently designed.
- Document production reconciliation still required.
- Ensure “activity log” audit-feed terminology is not accidentally removed; only Time Activity catalog is retired.

**Step 4: Verify GREEN and build**

**Step 5: Commit**

```bash
git add src/lib/navigation/app-navigation.ts 'src/app/(app)/app/time/activities/page.tsx' 'src/app/(app)/app/services/page.tsx' src/lib/legacy-activity-service-ui-retirement.test.ts docs/migration-registry.md
git commit -m "refactor: retire activity and service catalog UI"
```

---

### Task 11: Update reports and documentation

**Objective:** Make Task the active Time classification and document final UX/migration boundaries.

**Files:**
- Modify: `src/app/(app)/app/reports/page.tsx`
- Modify task/time report helpers and tests
- Modify: `docs/USER_GUIDE_CUBICLE.md`
- Modify: `docs/feature-status.md`
- Modify: `CHANGELOG.md`
- Create: `docs/operations/task-activity-service-reconciliation.md`

**Step 1: Write failing report tests**

Assert new aggregates group by Task without requiring Activity. Historical Activity rows without tasks stay under a clear fallback such as `Tanpa tugas` and remain counted.

**Step 2: Verify RED**

Current report query groups activity usage.

**Step 3: Implement report adaptation**

Preserve multi-currency rules. Do not change invoice totals or cross-currency aggregation.

**Step 4: Update docs**

Document:

- terminology
- billing-aware task modes
- flat template import
- task-required Hourly/Retainer logs
- Activity/Service UI retired but schema cleanup pending
- exact production reconciliation SQL/checklist, without credentials

**Step 5: Verify tests and docs checks**

Run targeted tests and `git diff --check`.

**Step 6: Commit**

```bash
git add 'src/app/(app)/app/reports/page.tsx' src/lib/*report*.test.ts docs CHANGELOG.md
git commit -m "docs: finalize billing-aware task workflow"
```

---

### Task 12: Full verification and browser QA

**Objective:** Prove behavior, build integrity, responsive UX, and migration safety before any deployment.

**Files:**
- Add/update Playwright tests under `e2e/` if reusable
- Create QA evidence doc under `docs/operations/evidence/`

**Step 1: Full automated verification**

Run in Node container:

```bash
npm run lint
npm run test
npm run build
```

Expected:

```text
ESLint exit 0
all Vitest files/tests pass
Next.js production build exit 0
```

**Step 2: Migration rehearsal**

- backup disposable source DB
- restore-test backup
- apply `0064` only
- verify schema/backfill/constraints
- run app against rehearsed DB
- authenticate and open Tasks, project detail, Time, Reports
- scan logs for `42P01`, `42703`, and application error cards

**Step 3: Browser QA desktop + 390×844**

Test:

```text
Fixed Price workflow List/Board
Hourly reusable task editor
Retainer reusable task editor and usage
complete global editor
complete detail editor
create/edit/archive/restore/reorder
keyboard/mobile move controls
multi-template import
flat merged result
skip/keep duplicates
Time task requirement
non-assignee logging
historical taskless Time Log
Billing tab + invoices
legacy redirects
no Activity/Service active navigation
```

Require zero horizontal overflow and zero console errors.

**Step 4: Commit QA artifacts**

```bash
git add e2e docs/operations/evidence
git commit -m "test: verify billing-aware task workflow"
```

---

### Task 13: Production deployment gate

**Objective:** Deploy code and additive migration safely only after explicit production approval.

**Prerequisites:**

- clean Git tree
- pushed commit SHA
- full tests/lint/build green
- DB backup with checksum and restore proof
- disposable migration rehearsal green
- read deployment guardrail files
- run pre-deploy collision check
- preserve current container environment
- explicit approval for production DB migration/deploy

**Deployment strategy:**

- `dokploy-traefik` remains sole owner of 80/443.
- Build immutable image tagged with Git SHA.
- Apply only reviewed additive `0064` to canonical production DB `cubicle`.
- Recreate/update `cubiqlo-new-app` preserving exact runtime environment and `dokploy-network`.
- Keep prior container/image for rollback.
- Do not run `0062`.

**Post-deploy verification:**

```text
/api/health DB ok
cubiqlo.com 200
app.cubiqlo.com expected redirect/app response
unrelated 9router route unchanged
authenticated Tasks/project/Time/Reports browser QA
fresh container logs clean
80/443 still owned only by dokploy-traefik
HEAD == origin/main
```

Record image, SHA, migration, backup, health, QA, and rollback handle in deployment evidence.

---

## Final acceptance checklist

- [ ] Global tabs are `Tugas Proyek | Template Tugas`.
- [ ] Project tab is `Pekerjaan` with billing-aware default editor.
- [ ] Fixed Price uses workflow List/Board.
- [ ] Hourly/Retainer use flat reusable Tasks.
- [ ] Multi-template import produces one flat project task set.
- [ ] Template names do not become project groups.
- [ ] Template targets filter compatibility.
- [ ] Duplicate preview defaults to skip and supports keep.
- [ ] Template/project copies remain independent.
- [ ] No subtask or persistent Task List hierarchy exists.
- [ ] Task required for new Hourly/Retainer Time Logs.
- [ ] Authorized non-assignee members can log time.
- [ ] Historical taskless/Activity-linked logs remain readable.
- [ ] Activity and Service active UI are retired non-destructively.
- [ ] Billing tab combines commercial summary and invoices.
- [ ] Desktop drag plus mobile/keyboard move controls work.
- [ ] Global pagination is max 10/page.
- [ ] Full automated and browser verification passes.
- [ ] No destructive cleanup runs without separate approval.
