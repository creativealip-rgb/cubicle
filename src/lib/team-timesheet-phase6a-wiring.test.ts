import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("Phase 6A team timesheet wiring", () => {
  it("provides today and weekly read-only views with week navigation", () => {
    const view = read("src/components/time/team-timesheet-view.tsx");
    expect(view).toContain('"Hari ini"');
    expect(view).toContain('"Mingguan"');
    expect(view).toContain("buildTodayTimeline");
    expect(view).toContain("buildWeekDays");
    expect(view).toContain("setWeekOffset");
    expect(view).toContain("grid-cols-1");
    expect(view).toContain("lg:grid-cols-7");
  });

  it("wires closed entries and active timer from time page", () => {
    const page = read("src/components/time/time-route-content.tsx");
    expect(page).toContain("TeamTimesheetView");
    expect(page).toContain("teamEntries");
    expect(page).toContain("pausedAt: timeEntries.pausedAt");
    expect(page).toContain("activeTimer");
  });
});
