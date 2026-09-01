# Productivity Visual Dashboard Implementation Plan

> **For Hermes:** Implement this plan task-by-task with strict TDD and verify each step.

**Goal:** Turn flat Productivity (Goals & Habits) surfaces into an interactive, visual progress dashboard with KPI summary, goal progress bars, 35-day habit heatmap, streaks, and clean dialog forms without external chart libraries.

**Architecture:** Pure helper functions for aggregations and metrics (`src/lib/personal-productivity/visuals.ts`), server components and client UI widgets (`src/components/productivity/*`), dialog-based goal/habit creation, responsive layout (mobile-first 390px up to desktop 2-column).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Vitest, Playwright.

---

### Task 1: Domain Logic & Metrics Calculations
- **Files:**
  - Create `src/lib/personal-productivity/visuals.ts`
  - Create `src/lib/personal-productivity/visuals.test.ts`
- **Logic:**
  - `calculateGoalMetrics(goals)`: total, active, completed, average progress, priority breakdown.
  - `calculateHabitHeatmap(habits, today, daysCount = 35)`: daily activity map with date, completedCount, totalScheduled, intensity (0-4).
  - `calculateHabitStreakAndRate(habit, today)`: current streak, best streak, 30-day rate.
  - `calculateWeeklyConsistency(habits, today, weeks = 5)`: week-by-week completion rates.
  - `getDeadlineStatus(deadline, today)`: days remaining, overdue, urgent (< 7 days), normal.

### Task 2: Visual Components for Overview & Progress
- **Files:**
  - Create `src/components/productivity/productivity-kpi-cards.tsx`
  - Create `src/components/productivity/goal-progress-card.tsx`
  - Create `src/components/productivity/habit-heatmap.tsx`
  - Create `src/components/productivity/goal-dialog.tsx`
  - Create `src/components/productivity/habit-dialog.tsx`

### Task 3: Refactor Productivity Pages & Sections
- **Files:**
  - Modify `src/app/(app)/app/productivity/page.tsx`
  - Modify `src/components/productivity/habits-section.tsx`
- **Features:**
  - Interactive overview with KPI stats, priority goal bars, and habit contribution heatmap.
  - Goals tab with filter pills (All / In Progress / Achieved), visual progress, and "Tambah Tujuan" dialog.
  - Habits tab with interactive check-in buttons, streak badges, 14-day mini sparkline bars, and "Tambah Kebiasaan" dialog.
  - Mobile responsiveness (390px viewport clean, 0 horizontal overflow).

### Task 4: Automated Verification & Gates
- **Steps:**
  - Run Vitest suite for visual helpers.
  - Run `npx tsc --noEmit`
  - Run `npm run lint`
  - Run `npm run build`
  - Run `git diff --check`

### Task 5: Dev Deploy & Browser QA Proof
- **Steps:**
  - Deploy to dev server using `scripts/operations/deploy-dev-integration.sh`
  - Run Playwright tests on `https://dev.cubiqlo.com/app/productivity` with persistent context.
  - Verify UI charts, interactions, goal creation, habit check-in, mobile layout, console logs.
  - Capture screenshots of Overview, Goals, and Habits tabs.
