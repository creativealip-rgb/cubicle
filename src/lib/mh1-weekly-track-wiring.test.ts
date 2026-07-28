import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("MH1 weekly track wiring", () => {
  it("provides a user-scoped secure weekly cell action", () => {
    const source = read("src/lib/actions/time.ts");
    expect(source).toContain("export async function setWeeklyTimeCell");
    expect(source).toContain("weeklyTimeCellSchema");
    expect(source).toContain("eq(timeEntries.userId, user.id)");
    expect(source).toContain("assertTimeEntryContext");
    expect(source).toContain("assertProjectTimeTrackingEnabled");
    expect(source).toContain("WEEKLY_GRID_TAG");
    expect(source).toContain("immutableMinutes");
    expect(source).toContain('eq(timeEntries.status, "draft")');
  });

  it("renders weekly navigation, row selection, cells, totals, and copy rows", () => {
    const component = read("src/components/time/weekly-time-grid.tsx");
    expect(component).toContain("export function WeeklyTimeGrid");
    expect(component).toContain("setWeeklyTimeCell");
    expect(component).toContain("Minggu sebelumnya");
    expect(component).toContain("Project / Activity");
    expect(component).toContain("Related Task opsional");
    expect(component).not.toContain("Project / Tugas");
    expect(component).toContain("Salin baris minggu lalu");
    expect(component).toContain("Tambah baris");
    expect(component).toContain("weekTotalMinutes");
  });

  it("wires the weekly grid into the time page", () => {
    const page = read("src/components/time/time-route-content.tsx");
    expect(page).toContain('import { WeeklyTimeGrid } from "@/components/time/weekly-time-grid"');
    expect(page).toContain("<WeeklyTimeGrid");
    expect(page).toContain("user.id");
  });
});
