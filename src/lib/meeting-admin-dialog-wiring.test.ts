import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/portal/portal-request-admin.tsx", "utf8");

describe("meeting admin dialogs", () => {
  it("does not use browser prompts", () => {
    expect(source).not.toContain("window.prompt");
  });

  it("renders a structured reschedule dialog", () => {
    expect(source).toContain("Ubah Jadwal Pertemuan");
    expect(source).toContain('type="date"');
    expect(source).toContain('type="time"');
    expect(source).toContain("Kirim usulan jadwal");
    expect(source).toContain("Catatan untuk klien");
  });

  it("renders a rejection reason dialog", () => {
    expect(source).toContain("Tolak Pertemuan");
    expect(source).toContain("Alasan penolakan");
  });
});
