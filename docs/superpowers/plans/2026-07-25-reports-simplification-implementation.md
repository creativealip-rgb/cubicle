# Reports Simplification Implementation Plan

> **For Hermes:** Execute task-by-task with verification after each task.

**Goal:** Simplify Cubiqlo Reports around period-aware income, expenses, net, breakdowns, and one receivables card.

**Architecture:** Keep report data fetching server-side. Extract pure period/date helpers for deterministic tests. Add a small client report-control component that updates URL search parameters. Render a dependency-free accessible grouped-bar chart. Preserve existing forecast/project/aging calculations inside native progressive disclosure.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle/PostgreSQL, Tailwind CSS, Vitest.

---

### Task 1: Add period parsing and grouping helpers

**Files:**

- Create: `src/lib/report-period.ts`
- Create: `src/lib/report-period.test.ts`

**Steps:**

1. Write tests for current month default, previous month, quarter, year, valid custom range, invalid custom fallback, previous equivalent period, and weekly/monthly group generation.
2. Run `npx vitest run src/lib/report-period.test.ts`; expect failure before implementation.
3. Implement pure helpers with local calendar dates and inclusive ranges.
4. Re-run test; expect pass.

### Task 2: Add period controls and accessible chart components

**Files:**

- Create: `src/components/reports/report-controls.tsx`
- Create: `src/components/reports/income-expense-chart.tsx`

**Steps:**

1. Build URL-backed preset selector and export control without new dependencies.
2. Build responsive grouped bars with labels, exact values, keyboard focus, and screen-reader summary.
3. Type-check components with `npx tsc --noEmit`.

### Task 3: Rework report queries and aggregation

**Files:**

- Modify: `src/app/(app)/app/reports/page.tsx`

**Steps:**

1. Accept and normalize `searchParams`.
2. Query payment and expense rows for selected plus comparison periods.
3. Convert every aggregate using workspace FX rates; never sum raw currencies.
4. Aggregate chart groups, client payment sources, and expense categories for selected period.
5. Keep receivables current-as-of-today and sort urgent invoices by days overdue.
6. Type-check.

### Task 4: Replace report information hierarchy

**Files:**

- Modify: `src/app/(app)/app/reports/page.tsx`

**Steps:**

1. Replace header actions with period controls and export.
2. Render three period-aware KPI cards.
3. Render combined chart.
4. Render top-five income sources and expense categories.
5. Merge collection health and overdue information into one receivables card.
6. Move aging, forecast, and project expenses into collapsed `Analisis lainnya`.
7. Ensure empty states, links, bilingual strings, and mobile layout.
8. Type-check and lint touched files.

### Task 5: Verify production behavior

**Files:**

- No source changes unless verification finds defects.

**Steps:**

1. Run focused tests.
2. Run `npx tsc --noEmit`.
3. Run `npm run build`.
4. Read deployment rules and run pre-deploy checks.
5. Rebuild/restart existing Cubiqlo service through its established Docker path.
6. Verify health endpoint.
7. Browser-test `/app/reports` on desktop and real 390×844 mobile viewport.
8. Verify default month, preset URL navigation, no horizontal overflow, and collapsed advanced analysis.
9. Commit source changes with conventional commit and push current branch.
