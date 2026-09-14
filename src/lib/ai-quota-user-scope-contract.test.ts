import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("AI quota user scope", () => {
  it("keys monthly quota by user across schema, migration, and callers", () => {
    const schema = readFileSync("src/db/schema.ts", "utf8");
    const plan = readFileSync("src/lib/plan.ts", "utf8");
    const migration = readFileSync("drizzle/0101_ai_usage_per_user.sql", "utf8");
    expect(schema).toContain('userId: text("user_id").notNull()');
    expect(schema).toContain("unique(\"ai_usage_daily_user_date_uidx\").on(t.userId, t.usageDate)");
    expect(plan).toContain("target: [aiUsageDaily.userId, aiUsageDaily.usageDate]");
    expect(plan).toContain("eq(aiUsageDaily.userId, userId)");
    expect(migration).toContain("SET user_id = workspaces.owner_id");
    for (const path of [
      "src/app/api/ai/chat/route.ts",
      "src/app/api/ai/action/route.ts",
      "src/lib/actions/personal-site-ai.ts",
      "src/lib/actions/visual-prompts.ts",
    ]) expect(readFileSync(path, "utf8")).toMatch(/checkAiRateLimitDb\([^\n]+\.id, plan\)/);
  });
});