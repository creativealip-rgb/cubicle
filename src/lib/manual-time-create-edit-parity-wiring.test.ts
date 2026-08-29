import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const create = readFileSync("src/components/time/add-time-log-dialog.tsx", "utf8");
const route = readFileSync("src/components/time/time-route-content.tsx", "utf8");
const action = readFileSync("src/lib/actions/time.ts", "utf8");

describe("manual time create/edit form parity", () => {
  it("uses edit-entry field order and controls in Catat Waktu", () => {
    const labels = ["Klien & Proyek", "Tugas", "Deskripsi", "Tag", "Durasi (HH:MM:SS)", "Tanggal", "Tagihan / Billable"];
    let cursor = -1;
    for (const label of labels) {
      const next = create.indexOf(label, cursor + 1);
      expect(next, `${label} must render after previous field`).toBeGreaterThan(cursor);
      cursor = next;
    }
    expect(create).toContain('value={billable ? "yes" : "no"}');
    expect(create).toContain('status: "approved"');
    expect(create).not.toContain("manual-time-hours");
  });

  it("passes client identity and persists selected create status", () => {
    expect(route).toMatch(/clients=\{clientList\}/);
    expect(action).toContain('status: z.enum(["draft", "approved"]).default("draft")');
    expect(action).toContain("updateData.status = parsed.status");
  });
});
