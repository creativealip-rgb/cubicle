import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const weekly = readFileSync("src/components/time/weekly-time-grid.tsx", "utf8");
const manual = readFileSync("src/components/time/add-time-log-dialog.tsx", "utf8");

describe("weekly My Hours parity", () => {
  it("keeps five usable draft rows when week has no rows", () => {
    expect(weekly).toContain("MIN_WEEKLY_ROWS = 5");
    expect(weekly).toContain("WeeklyDraftRow");
    expect(weekly).not.toContain("<EmptyState");
    expect(weekly).toContain('placeholder="HH:MM"');
  });

  it("opens grouped project and task lists from fields or arrows", () => {
    expect(weekly).toContain("ChevronDown");
    expect(weekly).toContain("Search project / client");
    expect(weekly).toContain("No client");
    expect(weekly).toContain("Please select a project first");
    expect(manual).toContain("ChevronDown");
    expect(manual).toContain("Toggle project list");
    expect(manual).toContain("Toggle task list");
  });
});
