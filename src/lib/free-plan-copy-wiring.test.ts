import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Free plan entitlement copy matches config", () => {
  // Source of truth: plan.ts PLAN_LIMITS.free has hasClientPortal: true,
  // hasAiAssistant: true, aiRequestsPerMonth: 10.
  it("does not claim Client Portal is Solo/Team-only (Free has it enabled)", () => {
    expect(read("src/lib/actions/clients.ts")).not.toContain(
      "Client portal tersedia di paket Solo dan Team",
    );
  });

  it("does not claim AI Assistant is unavailable on Free (Free has 10/month)", () => {
    expect(read("src/lib/plan.ts")).not.toContain(
      "AI Assistant tersedia di paket Solo dan Team",
    );
    expect(read("src/app/api/ai/chat/route.ts")).not.toContain(
      "tidak tersedia di plan Free",
    );
  });
});
