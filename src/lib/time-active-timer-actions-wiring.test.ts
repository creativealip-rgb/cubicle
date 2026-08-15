import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("active timer actions wiring", () => {
  it("keeps Start Timer on the Time page and removes duplicate navbar timer control", () => {
    const route = read("src/components/time/time-route-content.tsx");
    const topbar = read("src/components/app-topbar.tsx");

    expect(route).toContain("<NewTimerDialog");
    expect(route).not.toContain("!activeTimer && <NewTimerDialog");
    expect(topbar).not.toContain("/api/time/active");
    expect(topbar).not.toContain("Active timer");
    expect(topbar).not.toContain("handleStopTimer");
  });
});
