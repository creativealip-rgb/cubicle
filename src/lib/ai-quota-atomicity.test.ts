import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const plan = () => read("src/lib/plan.ts");
const chat = () => read("src/app/api/ai/chat/route.ts");
const action = () => read("src/app/api/ai/action/route.ts");
const psa = () => read("src/lib/actions/personal-site-ai.ts");
const visual = () => read("src/lib/actions/visual-prompts.ts");

describe("AI quota atomicity contract (plan.ts)", () => {
  it("checkAiRateLimitDb is a single atomic INSERT ... ON CONFLICT DO UPDATE ... RETURNING", () => {
    const src = plan();
    expect(src).toContain("onConflictDoUpdate");
    expect(src).toContain(".returning({ count: aiUsageDaily.count })");
    // Old two-step SELECT-then-increment (read + write race window) must be gone.
    expect(src).not.toContain("COALESCE(SUM(");
  });

  it("DO UPDATE is guarded by count < limit so concurrent requests cannot exceed the cap", () => {
    const src = plan();
    expect(src).toContain("setWhere:");
    expect(src).toContain("aiUsageDaily.count} < ${limit}");
    // Increment is count + 1, never an overwrite of the row.
    expect(src).toContain("aiUsageDaily.count} + 1");
  });

  it("releaseAiQuota(workspaceId) decrements atomically with a floor of zero", () => {
    const src = plan();
    expect(src).toMatch(/export async function releaseAiQuota/);
    expect(src).toContain("GREATEST(");
    expect(src).toContain("aiUsageDaily.count} - 1");
    // Only decrement rows that actually have quota (never below zero).
    expect(src).toContain("gt(aiUsageDaily.count, 0)");
  });

  it("documents the no-refund-after-successful-provider-response boundary", () => {
    const src = plan();
    expect(src).toMatch(/provider response/i);
    expect(src).toMatch(/never refund|no refund/i);
  });

  it("unlimited plan (limit 0) short-circuits without touching the DB", () => {
    expect(plan()).toContain("limit === 0");
  });
});

describe("AI quota wiring (reserve before provider, release only on provider failure)", () => {
  it("chat route reserves quota and releases only when the provider never succeeded", () => {
    const src = chat();
    expect(src).toContain("checkAiRateLimitDb");
    expect(src).toContain("releaseAiQuota");
    // Refund gate: release happens only if no successful provider response.
    expect(src).toContain("providerSucceeded");
    // Reservation made before the agent/provider loop starts.
    expect(src.indexOf("checkAiRateLimitDb")).toBeLessThan(src.indexOf("runAgentLoop"));
  });

  it("action route releases quota when execution throws after reservation", () => {
    const src = action();
    expect(src).toContain("checkAiRateLimitDb");
    expect(src).toContain("releaseAiQuota");
    // Tracks which workspace had a reservation so the catch can roll it back.
    expect(src).toContain("quotaWorkspaceId");
  });

  it("personal-site-ai reserves, then releases only if the provider call fails", () => {
    const src = psa();
    expect(src).toContain("checkAiRateLimitDb");
    expect(src).toContain("releaseAiQuota");
    expect(src).toContain("providerSucceeded");
  });

  it("visual-prompts reserves atomically, releases on provider failure, and drops the hardcoded IP", () => {
    const src = visual();
    expect(src).toContain("checkAiRateLimitDb");
    expect(src).toContain("releaseAiQuota");
    expect(src).toContain("providerSucceeded");
    // No hardcoded 10.0.1.12 anywhere.
    expect(src).not.toContain("10.0.1.12");
    // OPENAI_API_BASE || AI_BASE_URL || default.
    expect(src).toMatch(/OPENAI_API_BASE\s*\|\|\s*process\.env\.AI_BASE_URL/);
  });
});
