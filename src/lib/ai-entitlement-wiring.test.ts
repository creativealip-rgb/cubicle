import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const action = readFileSync("src/app/api/ai/action/route.ts", "utf8");
const conv = readFileSync("src/app/api/ai/conversations/route.ts", "utf8");
const exp = readFileSync("src/app/api/ai/conversations/export/route.ts", "utf8");

describe("AI entitlement wiring", () => {
  it("AI action checks plan entitlement and daily quota", () => {
    expect(action).toContain("getAiEntitlementFailure");
    expect(action).toContain("checkAiRateLimitDb");
    expect(action).toContain("ai:action");
  });

  it("conversation endpoints check entitlement and Redis rate limit", () => {
    expect(conv).toContain("getAiEntitlementFailure");
    expect(conv).toContain("enforceRateLimitResponse");
    expect(exp).toContain("getAiEntitlementFailure");
    expect(exp).toContain("enforceRateLimitResponse");
  });
});
