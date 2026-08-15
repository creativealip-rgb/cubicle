import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("active timer actions wiring", () => {
  it("hides the page-level Start Timer action while an active timer exists", () => {
    const content = read("src/components/time/time-route-content.tsx");

    expect(content).toContain("!activeTimer && <NewTimerDialog");
  });
});
