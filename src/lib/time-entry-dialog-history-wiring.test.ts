import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/time/timesheet.tsx", "utf8");

describe("time entry edit dialog and history", () => {
  it("does not show activity select in edit dialog", () => {
    expect(source).not.toContain("Label className=\"text-xs\">{t(\"Activity\"");
    expect(source).not.toContain("editActivities.map");
  });

  it("renames related task label to task", () => {
    expect(source).toContain("{t(\"Tugas\", \"Task\")}");
    expect(source).not.toContain("Tugas terkait");
    expect(source).not.toContain("Related Task");
  });

  it("uses project and task as history primary title before description", () => {
    expect(source).toContain("historyPrimaryTitle");
    expect(source).toContain("historyDescription");
    expect(source).toMatch(/historyPrimaryTitle[\s\S]*entry\.projectName[\s\S]*entry\.taskTitle/);
  });
});
