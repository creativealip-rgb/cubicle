import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("admin growth query wiring", () => {
  it("keeps auth, rate limit, bounded ranges, activation CTE, and plan filters", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/actions/admin/dashboard.ts"), "utf8");
    expect(source).toContain("requireAdmin");
    expect(source).toContain("enforceServerActionRateLimit");
    expect(source).toContain("parseGrowthRange");
    expect(source).toContain("WITH bounds");
    expect(source).toContain("has_activity");
    expect(source).toContain("payment_type = 'plan'");
  });
});
