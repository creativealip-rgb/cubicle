import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/time/weekly-time-grid.tsx", "utf8");
const gridContract = "grid-cols-[minmax(280px,1.7fr)_minmax(220px,1.35fr)_repeat(7,minmax(72px,.55fr))_80px]";

describe("weekly grid filled and empty column parity", () => {
  it("keeps filled header, rows, and totals on empty-grid dimensions", () => {
    expect(source.split(gridContract)).toHaveLength(6);
    expect(source).not.toContain("min-w-[900px]");
    expect(source).toContain("min-w-[1092px]");
    expect(source).not.toContain('t("Project / Task", "Project / Task")');
    expect(source).toContain('className="col-span-2 text-left text-xs font-semibold text-muted-foreground"');
  });

  it("prevents populated inputs from expanding their day columns", () => {
    expect(source).toContain('className="group/cell relative flex min-w-0 items-center justify-center"');
    expect(source).toContain("h-9 w-full min-w-0 pr-5 text-center text-xs tabular-nums");
  });
});
