import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/time/timesheet.tsx", "utf8");

describe("time entry edit dialog and history", () => {
  it("keeps legacy activity data but removes activity selector from edit dialog", () => {
    expect(source).not.toContain("editActivities.map");
  });
  it("uses Task label in edit dialog", () => {
    // Label switches between required ("Tugas *") and optional variants.
    expect(source).toContain('t("Tugas (Opsional)", "Task (Optional)")');
  });
  it("shows project and task before description", () => {
    expect(source).toContain("historyPrimaryTitle");
    expect(source).toContain("historyDescription");
  });
});