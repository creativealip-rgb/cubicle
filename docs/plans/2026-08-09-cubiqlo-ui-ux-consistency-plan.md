# Cubiqlo UI/UX Consistency Implementation Plan

> **For Hermes:** Execute task-by-task. Keep changes minimal, verify each batch, do not deploy production without explicit approval.

**Goal:** Finish UI/UX consistency work identified by the 47+ page source audit, without changing business logic.

**Architecture:** Reuse existing semantic tokens, `EmptyState`, `StatusFilterTabs`, shared `Button`/`Select`/`Skeleton`, and existing page-header classes. Avoid new abstractions unless current shared components cannot express target.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, Vitest, Playwright.

---

## Baseline

- Audit source: 47+ app pages, 15+ UI components.
- No P0 found.
- Batch 1 started from `904589a standardize core app UI consistency`; all listed UI batches are now complete.
- Current branch: `main`, clean and synced with `origin/main`.
- Hydration #418 remains separate investigation; no fix included here.
- Browser smoke matrix completed for declared desktop/mobile route scope.

## Acceptance rules

- Preserve business logic and route behavior.
- No production deploy in this plan unless explicitly requested.
- Every code batch: focused test/lint/build check, `git diff --check`, commit.
- Use semantic colors: `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-background`.
- Main action buttons use shared sizes; icon actions target `h-9 w-9` desktop and at least `h-10 w-10` touch targets mobile.
- Empty states use `EmptyState` or equivalent `rounded-xl border bg-card`.

---

## Progress ledger

### Batch 1 — complete

- [x] Page-header normalization on audited outliers.
- [x] Empty-state normalization on main audited outliers.
- [x] i18n leak cleanup on identified files.
- [x] Mobile list-card normalization across clients/tasks/projects/expenses.
- [x] Button/icon sizing on audited app-shell actions.
- [x] Focused i18n wiring test committed.

### Batch 2 — complete

- [x] Normalize clients/tasks/projects/expenses mobile list cards and dense tables.
- [x] Normalize button/icon action sizes in timesheet, topbar, notifications.
- [x] Normalize long dialogs and loading skeletons.
- [x] Verify Search has no horizontal overflow/double-gutter symptom.
- [x] Migrate ReportTabs to canonical tabs.
- [x] Replace high-signal direct slate/white colors in touched core routes only.

### Batch 3 — complete with one deferred item

- [x] Dark-mode decision: app shell remains light-only for this plan. `dark` presets belong to public landing-site themes, not app chrome.
- [x] Improve keyboard behavior for `StatusFilterTabs`.
- [~] Native selects: invoice add-item flow done; email remains native because it is a server-action HTML form and Radix Select needs client/hidden-field wiring.
- [x] Browser matrix: desktop 18/18 and mobile 12/12 route smoke; Prompt Studio, project detail, and client detail mobile smoke also passed.

### Release gate

- [x] Main merged and pushed: `070dde7` plus Docker optional-dependency fix `77c2bad`.
- [x] Dev rebuilt with optional native dependencies and recreated healthy.
- [x] Dev health: `status=ok`, `db=ok`.
- [x] Prompt Studio invalid-submit QA: no HTTP 500, no quota burn.
- [x] Prompt Studio valid-generation QA on dev: result returned, no console errors, no overflow.
- [x] Production release: image `sha256:54fcdd48...`, health `ok`, route HTTP 200, `dokploy-traefik` sole 80/443 owner.
- [x] Production Prompt Studio smoke: authenticated generation returned result, mobile overflow false.
- [ ] Hydration #418: separate intermittent investigation, not part of UI consistency completion.
- [~] Email native select remains deferred.

---

## Execution tasks

### Task 1: Normalize mobile list cards and dense tables

**Files:**
- Modify: `src/components/clients/clients-list-table.tsx`
- Modify: `src/components/tasks/tasks-list-table.tsx`
- Modify: `src/components/projects/projects-list-table.tsx`
- Modify: `src/components/expenses/expenses-list-table.tsx`
- Tests: existing component tests; add only if a reusable class contract lacks coverage.

**Target:** mobile rows use `rounded-lg border bg-card p-4 hover:bg-muted/50`; desktop dense tables use `overflow-hidden rounded-lg border bg-card`, cells `p-3`, rows `border-b`.

**Verify:** `npm test -- --run`, `npm run lint`, `git diff --check`.

### Task 2: Normalize action button and icon sizes

**Files:**
- Modify: `src/components/time/timesheet.tsx`
- Modify: `src/components/app-topbar.tsx`
- Modify: `src/components/notifications-bell.tsx`

**Target:** desktop icon actions `h-9 w-9`; mobile touch actions at least `h-10 w-10`; text actions use `size="sm"` and `gap-1.5`.

**Verify:** lint, focused tests, source search for listed outlier classes.

### Task 3: Normalize dialogs and loading states

**Files:**
- Modify: `src/components/time/add-time-log-dialog.tsx`
- Modify: `src/components/time/timesheet.tsx`
- Modify: `src/components/clients/client-create-dialog.tsx`
- Modify: `src/components/clients/client-edit-dialog.tsx`
- Modify: `src/components/expenses/*` only where dialog pattern is outlier.
- Modify: `src/components/questionnaires/questionnaire-builder.tsx`
- Modify: `src/app/(app)/app/templates/page.tsx`
- Modify: `src/app/(app)/app/settings/page.tsx`

**Target:** long forms use `max-h-[min(90dvh,720px)] overflow-hidden` with scrollable body and stable footer; loading uses `Skeleton` matching final layout.

### Task 4: Fix remaining layout outliers

**Files:**
- Modify: `src/app/(app)/app/search/page.tsx`
- Modify: `src/app/(app)/app/reports/page.tsx`

**Target:** remove Search double padding; migrate ReportTabs to canonical tabs only if query/keyboard behavior remains intact.

### Task 5: Semantic color cleanup

**Scope:** touched core routes only; do not mass-rewrite 700+ usages.

**Verify:** search direct `text-slate-*`, `bg-white`, `border-slate-*` in changed files; inspect intentional status colors before replacement.

### Task 6: QA matrix and release gate

**Prerequisite:** QA account no longer returns HTTP 429.

**Verify:** desktop 1440px and mobile 390px across route matrix, console errors, horizontal overflow, headers, empty states, action touch targets, dialogs, and loading states. Hydration #418 report separately.

---

## Stop conditions

Stop and report if:

- business logic changes become necessary;
- shared component API must change broadly;
- QA remains rate-limited;
- hydration #418 reappears but exact mismatching component is unknown;
- build/typecheck fails outside touched scope.

## Current next action

UI consistency implementation complete. Optional follow-up: run Prompt Studio mutation QA and continue separate hydration #418 investigation.

---

**Last updated:** 2026-08-09 after `070dde7`, production release, and authenticated Prompt Studio smoke.
