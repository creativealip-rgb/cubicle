import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("effective AI entitlement wiring", () => {
  it("visual-prompts reads the effective plan (getUserPlan), not raw users.plan", () => {
    const source = read("src/lib/actions/visual-prompts.ts");
    expect(source).toContain("getUserPlan");
    // Effective plan must drive the generation limit shown/enforced
    expect(source).toMatch(/getPlanLimits\(plan\)/);
    // Raw plan read must be gone — expired paid users must not keep full quota
    expect(source).not.toMatch(/select\(\{ plan: users\.plan \}\)/);
  });

  it("prompts page reads the effective plan for generationLimit display", () => {
    const page = read("src/app/(app)/app/prompts/page.tsx");
    expect(page).toContain("getUserPlan");
    expect(page).not.toMatch(/select\(\{ plan: users\.plan \}\)/);
  });

  it("personal-site-ai enforces AI entitlement and monthly quota", () => {
    const source = read("src/lib/actions/personal-site-ai.ts");
    expect(source).toContain("getAiEntitlementFailure");
    expect(source).toContain("checkAiRateLimitDb");
    expect(source).toContain("getUserPlan");
    // Entitlement failure aborts generation before the provider call
    expect(source).toMatch(/entitlementFailure/);
    // Quota exhaustion aborts generation with a user-facing error
    expect(source).toMatch(/aiRate\.allowed/);
    expect(source).toMatch(/Batas|batas/);
  });
});
