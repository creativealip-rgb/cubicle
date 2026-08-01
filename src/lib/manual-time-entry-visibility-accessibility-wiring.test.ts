import { describe, expect, it } from "vitest";
import fs from "node:fs";

const route = fs.readFileSync("src/components/time/time-route-content.tsx", "utf8");
const form = fs.readFileSync("src/components/time/add-time-log-dialog.tsx", "utf8");

describe("manual time entry visibility and accessibility", () => {
  it("includes completed timers and duration-only manual entries", () => {
    expect(route).toContain("or(isNotNull(timeEntries.endTime), isNotNull(timeEntries.manualMinutes))");
  });

  it("associates every manual-time label with its control", () => {
    for (const id of ["manual-time-client", "manual-time-project", "manual-time-task", "manual-time-description", "manual-time-date", "manual-time-duration", "manual-time-tags"]) {
      expect(form).toContain(`htmlFor="${id}"`);
      expect(form).toContain(`id="${id}"`);
    }
  });
});
