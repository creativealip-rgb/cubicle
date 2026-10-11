import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/app/calendar/page.tsx", "utf8");
const panel = readFileSync("src/components/calendar/appointments-list-panel.tsx", "utf8");

describe("calendar upcoming empty state", () => {
  it("centers empty content vertically and horizontally", () => {
    const start = panel.indexOf("displayList.length === 0");
    const emptyState = panel.slice(start, panel.indexOf("EmptyState", start));
    expect(emptyState).toContain("flex");
    expect(emptyState).toContain("items-center");
    expect(emptyState).toContain("justify-center");
    expect(emptyState).toContain("h-56");
    // Outer card keeps the two-column shell and stretches its content area.
    expect(page).toContain('className="flex h-full flex-col lg:col-span-2"');
    expect(page).toContain("<AppointmentsListPanel");
  });
});
