# MH1 Weekly Track Implementation Plan

> **For Hermes:** Use test-driven-development task-by-task.

**Goal:** Add editable My Hours-style weekly Project/Task grid to Cubiqlo Time page while preserving timer history and protected entries.

**Architecture:** Pure helper builds week dates, parses durations, groups entries, and calculates editable versus immutable minutes. Server action writes one tagged grid-managed draft manual entry per Project/Task/day. Client component renders responsive week navigation, row selection, cell editing, totals, and previous-week row copy.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Tailwind CSS.

---

### Task 1: Weekly grid domain helper

**Files:**
- Create: `src/lib/weekly-time-grid.ts`
- Test: `src/lib/weekly-time-grid.test.ts`

**Steps:**
1. Write failing tests for duration parsing, Monday week boundaries, Project/Task grouping, daily totals, editable and immutable minute split.
2. Run `npm test -- --run src/lib/weekly-time-grid.test.ts`; expect missing module failure.
3. Implement minimal pure helper.
4. Re-run test; expect pass.

### Task 2: Secure weekly-cell server action

**Files:**
- Modify: `src/lib/actions/time.ts`
- Test: `src/lib/mh1-weekly-track-wiring.test.ts`

**Steps:**
1. Write failing wiring tests requiring `setWeeklyTimeCell`, schema validation, user scoping, project/task context validation, project tracking policy, grid tag, immutable floor rejection, and draft-only managed-entry writes.
2. Run target test; expect failure because action is absent.
3. Implement action using existing access/rate/activity policy helpers and DB transaction.
4. Re-run target test; expect pass.

### Task 3: Responsive Weekly Track component

**Files:**
- Create: `src/components/time/weekly-time-grid.tsx`
- Modify: `src/app/(app)/app/time/page.tsx`
- Test: `src/lib/mh1-weekly-track-wiring.test.ts`

**Steps:**
1. Extend failing wiring tests for component, week controls, Project/Task row picker, day inputs, copy-row control, and page integration.
2. Run target test; expect failure.
3. Implement responsive component and page data wiring.
4. Re-run target test; expect pass.

### Task 4: Regression verification

**Steps:**
1. Run `npm test`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Fix only MH1-related failures, rerunning target then full checks.

### Task 5: Dev smoke test

**Steps:**
1. Read deploy guardrails and run pre-deploy check from worktree.
2. Build dev image and recreate only `cubicle-dev`; no production deploy.
3. Browser test `/app/time` desktop and 390px mobile.
4. Verify no public proxy/port collision.

### Task 6: Ship branch

**Steps:**
1. Review `git diff` and status.
2. Commit using conventional commit.
3. Push feature branch.
4. Report commit, checks, UI evidence, and explicitly state production unchanged.
