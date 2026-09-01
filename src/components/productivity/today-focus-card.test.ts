import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const component = readFileSync("src/components/productivity/today-focus-card.tsx", "utf8");

describe("today focus card", () => {
  it("exposes daily focus and next-action links", () => {
    expect(component).toContain("Today's focus");
    expect(component).toContain("Check habits");
    expect(component).toContain("Update a goal");
    expect(component).toContain("Active goals");
  });
});
