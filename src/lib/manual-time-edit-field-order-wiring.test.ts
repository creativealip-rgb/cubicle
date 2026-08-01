import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/time/timesheet.tsx", "utf8");

describe("edit time entry field order", () => {
  it("places description immediately before tags instead of at top", () => {
    const dialog = source.slice(source.indexOf('<Dialog open={editOpen}'), source.indexOf('</Dialog>', source.indexOf('<Dialog open={editOpen}')));
    const labels = ["Klien", "Proyek", "Tugas", "Tanggal", "Durasi (menit)", "Deskripsi", "Tag", "Bisa ditagih", "Status"];
    let cursor = -1;
    for (const label of labels) {
      const next = dialog.indexOf(label, cursor + 1);
      expect(next, `${label} must render after previous field`).toBeGreaterThan(cursor);
      cursor = next;
    }
  });
});
