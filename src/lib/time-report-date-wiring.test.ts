import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("effective work-date query wiring", () => {
  it("does not include null work dates in every selected daily period", () => {
    const route = read("src/components/time/time-route-content.tsx");
    expect(route).not.toContain("isNull(timeEntries.workDate))))");
    expect(route).toContain("effectiveWorkDateSql(timeEntries)");
  });

  it("uses effective work date for both report time queries", () => {
    const reports = read("src/app/(app)/app/reports/page.tsx");
    expect(reports).toContain("effectiveWorkDateSql(timeEntries)");
    expect(reports).not.toContain("sql`(${timeEntries.startTime})::date`");
  });
});

describe("requested UI cleanup", () => {
  it("removes redundant client notes tab but keeps summary notes", () => {
    const client = read("src/app/(app)/app/clients/[clientId]/page.tsx");
    expect(client).not.toContain('value="notes"');
    expect(client).not.toContain("?tab=notes");
    expect(client).toContain("Catatan Internal");
  });

  it("removes tasks and timer separation banner", () => {
    const tasks = read("src/app/(app)/app/tasks/page.tsx");
    expect(tasks).not.toContain("Tugas dan Timer terpisah");
    expect(tasks).not.toContain("Tasks and Timer are separate");
  });
});
