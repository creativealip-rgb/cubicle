import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("latest Waktu layout", () => {
  it("keeps canonical shell, daily and weekly navigation, and header actions", () => {
    const content = readFileSync("src/components/time/time-route-content.tsx", "utf8");
    const header = readFileSync("src/components/time/time-header.tsx", "utf8");
    expect(content).toContain("TimePageShell");
    expect(content).toContain("WaktuNavigation");
    expect(content).toContain("AddTimeLogDialog");
    expect(content).toContain("NewTimerDialog");
    expect(content).toContain("PdfExportButton");
    expect(header).toContain("Harian");
    expect(header).toContain("Mingguan");
  });
});