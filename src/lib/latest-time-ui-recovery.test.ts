import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("latest Waktu UI recovery", () => {
  it("renders daily history in compact mode without legacy stats and filters", () => {
    const route = read("src/components/time/time-route-content.tsx");
    const timesheet = read("src/components/time/timesheet.tsx");
    expect(route).toContain("compact");
    expect(timesheet).toContain("compact?: boolean");
    expect(timesheet).toContain("!compact");
  });

  it("renders useful active timer details and controls", () => {
    const active = read("src/components/time/active-timer-card.tsx");
    expect(active).toContain("formatElapsed");
    expect(active).toContain("pauseTimer");
    expect(active).toContain("resumeTimer");
    expect(active).toContain("StopTimerDialog");
    expect(active).toContain("setStopDialogOpen(true)");
    expect(active).toContain("Tanpa proyek");
    expect(active).not.toContain("{timer.projectName} · {timer.taskTitle}");
  });

  it("uses compact weekly wrapper and keeps add-row form below the grid", () => {
    const weekly = read("src/components/time/weekly-time-grid.tsx");
    expect(weekly).toContain('className="rounded-lg border bg-card"');
    expect(weekly).not.toContain("<CardHeader");
    expect(weekly).toContain("Tambah baris");
  });
});
