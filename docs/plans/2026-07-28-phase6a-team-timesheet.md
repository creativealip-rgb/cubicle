# Phase 6A Team Timesheet Implementation Plan

> **For Hermes:** Use test-driven-development to implement this plan task-by-task.

**Goal:** Tambah Today timeline dan read-only Weekly grid ke `/app/time` tanpa mengubah lifecycle atau data.

**Architecture:** Helper murni menghitung rentang dan grouping. Server page menyuplai active + closed entries. Client view mengatur mode dan navigasi minggu; Timesheet existing tetap utuh.

**Tech Stack:** Next.js 16 App Router, TypeScript, React, Vitest, Tailwind/shadcn.

---

### Task 1: Pure timesheet model

**Files:**
- Create: `src/lib/team-timesheet.ts`
- Test: `src/lib/team-timesheet.test.ts`

1. Tulis failing tests untuk Monday week start, Sunday inclusion, active timer duration, paused duration, invalid timestamp exclusion.
2. Run `npm test -- --run src/lib/team-timesheet.test.ts`; expected FAIL karena module belum ada.
3. Implement type, `getWeekRange`, `getEffectiveMinutes`, `buildTodayTimeline`, `buildWeekDays`.
4. Run test; expected PASS.

### Task 2: Team timesheet UI

**Files:**
- Create: `src/components/time/team-timesheet-view.tsx`
- Test: `src/lib/team-timesheet-phase6a-wiring.test.ts`

1. Tulis failing wiring assertions untuk mode Hari ini/Mingguan, week navigation, mobile stacked layout, helper usage.
2. Run targeted test; expected FAIL.
3. Implement compact bilingual mode switch, today timeline, weekly seven-day cards, previous/current/next controls, empty states.
4. Run targeted tests; expected PASS.

### Task 3: Server page wiring

**Files:**
- Modify: `src/app/(app)/app/time/page.tsx`
- Modify test: `src/lib/team-timesheet-phase6a-wiring.test.ts`

1. Tambah failing assertions bahwa page menyuplai closed entries plus active timer ke `TeamTimesheetView`.
2. Run targeted test; expected FAIL.
3. Map common entry shape dan render view sebelum `Timesheet`. Pertahankan existing query isolation dan limit.
4. Run targeted test; expected PASS.

### Task 4: Verification

1. Run `npm test -- --run src/lib/team-timesheet.test.ts src/lib/team-timesheet-phase6a-wiring.test.ts`.
2. Run `npm run lint`.
3. Run `npm test`.
4. Run `npm run build`.
5. Read deploy guardrails, run pre-deploy check, rebuild `cubicle-dev` only.
6. Smoke `/app/time` desktop + 390px mobile; verify no overflow and week navigation.
7. Commit `feat: add phase 6a team timesheet views` and push feature branch only. No prod deploy.
