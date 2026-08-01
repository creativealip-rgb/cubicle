import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("billing-aware Waktu Phase 1", () => {
  it("makes /app/time history-first without legacy tabs", () => {
    const page = read("src/app/(app)/app/time/page.tsx");
    const header = read("src/components/time/time-header.tsx");
    const route = read("src/components/time/time-route-content.tsx");
    expect(page).toContain("searchParams");
    expect(route).toContain("<Timesheet");
    expect(route).toContain("AddTimeLogDialog");
    expect(route).toContain("NewTimerDialog");
    expect(header).toContain("Harian");
    expect(header).toContain("Mingguan");
    expect(header).not.toContain('label: "Timer"');
    expect(header).not.toContain("Kelola Aktivitas");
  });

  it("keeps manual logs task-first while empty timers start immediately", () => {
    const manual = read("src/components/time/add-time-log-dialog.tsx");
    const timer = read("src/components/time/new-timer-dialog.tsx");
    expect(manual).toContain("projectId");
    expect(manual).toContain("taskId");
    expect(manual).not.toContain("activityId");
    expect(manual).toContain("clientId");
    expect(manual).toContain("description.trim()");
    expect(timer).toContain("startTimer");
    expect(timer).toContain("startTimer({ workspaceId })");
    expect(timer).not.toContain("projectId");
    expect(timer).not.toContain("taskId");
  });

  it("keeps active timer synchronized and provides compatibility redirects", () => {
    const active = read("src/components/time/active-timer-card.tsx");
    const historyPage = read("src/app/(app)/app/time/history/page.tsx");
    const timesheetPage = read("src/app/(app)/app/time/timesheet/page.tsx");
    expect(active).toContain("cubicle:timer-changed");
    expect(active).toContain("/api/time/active");
    expect(historyPage).toContain('redirect("/app/time?view=daily")');
    expect(timesheetPage).toContain('redirect("/app/time?view=weekly")');
  });

  it("allows empty timer starts but requires Task and description for manual entries", () => {
    const actions = read("src/lib/actions/time.ts");
    expect(actions).toContain('taskId: z.string().uuid().optional().nullable()');
    expect(actions).toContain('const createManualEntrySchema = z.object({');
    expect(actions).toContain('taskId: z.string().uuid(),');
    expect(actions).toContain('description: z.string().trim().min(1');
  });
});
