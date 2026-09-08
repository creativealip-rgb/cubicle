import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/time/weekly-time-grid.tsx", "utf8");

describe("weekly desktop column widths", () => {
  it("keeps project and task wider than duration columns", () => {
    const columns = "grid-cols-[minmax(280px,1.7fr)_minmax(220px,1.35fr)_repeat(7,minmax(72px,.55fr))_80px]";
    expect(source.split(columns).length - 1).toBeGreaterThanOrEqual(2);
    expect(source).toContain('min-w-[1092px]');
    expect(source).not.toContain("minmax(150px,1fr)_minmax(150px,1fr)");
  });
});
