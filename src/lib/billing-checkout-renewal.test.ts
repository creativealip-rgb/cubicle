import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const checkout = readFileSync("src/app/api/billing/checkout/route.ts", "utf8");

describe("billing checkout plan renewal", () => {
  it("allows same-plan paid checkout so users can renew", () => {
    expect(checkout).not.toContain("effectivePlan === plan");
    expect(checkout).not.toContain("Kamu sudah di plan");
    expect(checkout).toContain("rank(plan) < rank(effectivePlan)");
  });
});
