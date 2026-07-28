import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Menu IA Batch 2 Time route wiring", () => {
  it("exposes shared Time navigation and all workflow routes", () => {
    const header = read("src/components/time/time-header.tsx");
    expect(header).toContain('href: "/app/time"');
    expect(header).toContain('href: "/app/time/timesheet"');
    expect(header).toContain('href: "/app/time/history"');
    expect(header).toContain('href: "/app/time/approvals"');
    expect(header).toContain('href="/app/time/activities"');
    expect(header).toContain('aria-current={active ? "page" : undefined}');
  });

  it("keeps each route focused on one existing workflow", () => {
    const expected = {
      "src/app/(app)/app/time/page.tsx": "timer",
      "src/app/(app)/app/time/timesheet/page.tsx": "timesheet",
      "src/app/(app)/app/time/history/page.tsx": "history",
      "src/app/(app)/app/time/approvals/page.tsx": "approvals",
    };
    for (const [path, mode] of Object.entries(expected)) {
      expect(read(path)).toContain(`<TimeRouteContent mode="${mode}" />`);
    }
    const content = read("src/components/time/time-route-content.tsx");
    for (const component of ["TimerWidget", "ManualEntryForm", "WeeklyTimeGrid", "TeamTimesheetView", "Timesheet", "PdfExportButton", "TimesheetApprovalPanel"]) {
      expect(content).toContain(component);
    }
  });

  it("reuses Activity catalog and preserves old route through redirect", () => {
    expect(read("src/app/(app)/app/time/activities/page.tsx")).toContain("ActivityCatalog");
    expect(read("src/app/(app)/app/activities/page.tsx")).toContain('redirect("/app/time/activities")');
  });

  it("preserves topbar timer event contract", () => {
    const topbar = read("src/components/app-topbar.tsx");
    expect(topbar).toContain('window.addEventListener("cubicle:timer-changed"');
    expect(topbar).toContain('window.dispatchEvent(new Event("cubicle:timer-changed"))');
  });
});
