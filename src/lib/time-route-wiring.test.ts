import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Billing-aware Waktu route wiring", () => {
  it("exposes canonical Harian and Mingguan navigation", () => {
    const header = read("src/components/time/time-header.tsx");
    expect(header).toContain('href: "/app/time?view=daily"');
    expect(header).toContain('href: "/app/time?view=weekly"');
    expect(header).not.toContain('href: "/app/time/approvals"');
    expect(header).not.toContain("Persetujuan");
    expect(header).not.toContain("Tautan");
    expect(header).not.toContain('href="/app/time/activities"');
    expect(header).not.toContain('label: "Timer"');
  });

  it("uses one history-first route with compatibility redirects", () => {
    const page = read("src/app/(app)/app/time/page.tsx");
    expect(page).toContain('view === "weekly" ? "timesheet" : "history"');
    expect(page).toContain("selectedDate");
    expect(read("src/app/(app)/app/time/timesheet/page.tsx")).toContain('redirect("/app/time?view=weekly")');
    expect(read("src/app/(app)/app/time/history/page.tsx")).toContain('redirect("/app/time?view=daily")');
    expect(read("src/app/(app)/app/time/approvals/page.tsx")).toContain('<TimeRouteContent mode="approvals" />');
    const content = read("src/components/time/time-route-content.tsx");
    for (const component of ["WaktuHistory", "WaktuNavigation", "AddTimeLogDialog", "NewTimerDialog", "ActiveTimerCard", "WeeklyTimeGrid", "TimesheetApprovalPanel"]) {
      expect(content).toContain(component);
    }
  });

  it("reuses Activity catalog and preserves old route through redirect", () => {
    expect(read("src/app/(app)/app/time/activities/page.tsx")).toContain("ActivityCatalog");
    expect(read("src/app/(app)/app/activities/page.tsx")).toContain('router.replace("/app/time/activities")');
  });

  it("preserves topbar timer event contract", () => {
    const topbar = read("src/components/app-topbar.tsx");
    expect(topbar).toContain('window.addEventListener("cubicle:timer-changed"');
    expect(topbar).toContain('window.dispatchEvent(new Event("cubicle:timer-changed"))');
  });
});
