# Personal Planning, Task Visibility, Human Errors, and Daily Quote Implementation Plan

> **For Hermes:** Execute directly with continuous-phase-implementation; strict TDD per slice.

**Goal:** Make new tasks client-visible by default, replace opaque domain errors, move personal finance into Personal > Planning, fix daily habit creation, and add persisted daily AI journal quotes.

**Architecture:** Preserve current tables and components where possible. Add one user-scoped quote table and action. Extract personal finance route ownership without duplicating business loaders. Keep domain guards server-authoritative and expose typed results.

**Tech Stack:** Next.js App Router, React, TypeScript, Drizzle/PostgreSQL, Vitest, existing OpenAI-compatible AI client.

---

### Task 1: Lock task visibility defaults

**Files:**
- Modify: `src/lib/actions/tasks.ts`
- Modify: `src/lib/actions/personal-notes.ts`
- Modify: `src/lib/actions/task-templates.ts`
- Modify: AI confirmation execution path discovered from `src/lib/ai/tools.ts`
- Test: focused task visibility test

**Steps:**
1. Write tests for omitted=true, explicit=false, note conversion, template import, AI confirmation.
2. Run tests; verify RED.
3. Add minimum explicit defaults at each insert boundary.
4. Run focused tests; verify GREEN.

### Task 2: Fix Add Habit payload and errors

**Files:**
- Modify: `src/components/productivity/habit-dialog.tsx`
- Modify: `src/lib/actions/personal-habits.ts` only if typed result needed
- Test: focused habit dialog/action test

**Steps:**
1. Test daily excludes weekdays; specific weekdays requires and sends selection; errors are visible.
2. Verify RED.
3. Patch submit payload and localized error state.
4. Verify GREEN.

### Task 3: Humanize locked project/client operations

**Files:**
- Modify: `src/lib/actions/projects.ts`
- Modify: `src/lib/actions/clients.ts`
- Modify: `src/components/forms/project-form.tsx`
- Modify: `src/components/projects/project-edit-dialog.tsx`
- Modify: `src/components/shared/permanent-delete-button.tsx`
- Test: focused domain result and form wiring tests

**Steps:**
1. Test typed expected errors, locked model, unrelated edit persistence, no partial mutation.
2. Verify RED.
3. Add discriminated results and server-derived lock state; preserve cascade semantics.
4. Verify GREEN.

### Task 4: Move personal finance to Planning

**Files:**
- Create: `src/app/(app)/app/planning/page.tsx`
- Modify: `src/app/(app)/app/expenses/page.tsx`
- Modify: `src/app/(app)/app/reports/page.tsx`
- Modify: `src/lib/navigation/app-navigation.ts`
- Modify: docs/internal links referencing old personal scopes
- Test: navigation/redirect/route tests

**Steps:**
1. Test exact Personal order, owner access, tabs, legacy redirects, Finance removal.
2. Verify RED.
3. Build Planning route around existing `PersonalExpensesSection` and `PersonalReportSection`; redirect before business loaders.
4. Remove personal scope UI/imports from Finance and update links/docs.
5. Verify GREEN.

### Task 5: Add persisted Quote of the Day

**Files:**
- Modify: `src/db/schema.ts`
- Create: next Drizzle migration and journal metadata
- Create: `src/lib/actions/daily-quote.ts`
- Create: `src/components/journal/daily-quote-card.tsx`
- Modify: `src/app/(app)/app/journal/page.tsx`
- Test: date/validation/fallback/concurrency/wiring tests

**Steps:**
1. Test IANA date resolution, Jakarta fallback, invalid AI output, timeout fallback, same-day stability, concurrent winner.
2. Verify RED.
3. Add schema/migration and minimum quote action using shared provider config without user quota/history.
4. Add card above `JournalInspirationBanner`.
5. Apply/replay migration on disposable PostgreSQL; verify GREEN.

### Task 6: Full verification and release

**Steps:**
1. Run focused tests, full Vitest, ESLint modified files, typecheck, production build, `git diff --check`.
2. Run local/production DB migration checks.
3. Browser QA desktop/mobile: task default, habits, project edit error, Planning tabs/redirects, Journal quote stability.
4. Inspect DB rows and fresh logs.
5. Commit focused source/tests/migration/docs; push.
6. Read deploy guardrails, run pre-deploy check, backup env/image, build SHA image, recreate only app container.
7. Verify internal/public health, proxy ownership, image SHA, DB constraints/data, browser flows, fresh logs.
