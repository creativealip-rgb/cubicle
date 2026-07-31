import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const helper = readFileSync("src/lib/plan-api-rate-limit.ts", "utf8");
const action = readFileSync("src/app/api/ai/action/route.ts", "utf8");
const conv = readFileSync("src/app/api/ai/conversations/route.ts", "utf8");
const exp = readFileSync("src/app/api/ai/conversations/export/route.ts", "utf8");

describe("plan API rate limit", () => {
  it("uses per-plan apiRequestsPerMinute through Redis", () => {
    expect(helper).toContain("apiRequestsPerMinute");
    expect(helper).toContain("enforceRateLimit");
    expect(helper).toContain("plan:api");
    expect(helper).toContain("workspaceId");
    expect(helper).toContain("userId");
  });

  it("wires plan API rate limit into AI workspace routes", () => {
    for (const source of [action, conv, exp]) {
      expect(source).toContain("enforcePlanApiRateLimit");
    }
  });
});
