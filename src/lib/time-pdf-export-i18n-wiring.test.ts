import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/time/pdf-export-button.tsx", "utf8");

describe("time PDF export i18n", () => {
  it("wraps export trigger and dialog copy in t()", () => {
    for (const text of [
      "Ekspor PDF",
      "Pilih jenis laporan",
      "Jenis laporan",
      "Bulan ini",
      "Semua klien",
      "Pilih klien dulu.",
      "Batal",
    ]) {
      expect(source).not.toContain(`> ${text}`);
      expect(source).not.toContain(`>${text}<`);
    }
    expect(source).toContain('t("Ekspor PDF", "Export PDF")');
    expect(source).toContain('t("Jenis laporan", "Report type")');
    expect(source).toContain('t("Semua klien", "All clients")');
  });
});
