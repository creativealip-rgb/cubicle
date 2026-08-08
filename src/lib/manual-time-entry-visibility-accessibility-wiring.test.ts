import { describe, expect, it } from "vitest";
import fs from "node:fs";

const route = fs.readFileSync("src/components/time/time-route-content.tsx", "utf8");
const form = fs.readFileSync("src/components/time/add-time-log-dialog.tsx", "utf8");

describe("manual time entry visibility and accessibility", () => {
  it("includes completed timers and duration-only manual entries", () => {
    expect(route).toContain("or(isNotNull(timeEntries.endTime), isNotNull(timeEntries.manualMinutes))");
  });

  it("associates every manual-time label with its control", () => {
    // Date/duration/description/tags keep label htmlFor/id pairs
    for (const id of ["manual-time-description", "manual-time-date", "manual-time-duration", "manual-time-tags"]) {
      expect(form).toContain(`htmlFor="${id}"`);
      expect(form).toContain(`id="${id}"`);
    }
    // Client+project is one combined combobox; task is a separate combobox.
    // Both expose id + aria-label for accessible naming.
    expect(form).toContain('id="manual-time-project"');
    expect(form).toMatch(/aria-label=\{t\("Cari klien atau proyek\.\.\."/);
    expect(form).toContain('id="manual-time-task"');
    expect(form).toMatch(/aria-label=\{projectId \? t\("Cari tugas\.\.\."/);
  });
});
