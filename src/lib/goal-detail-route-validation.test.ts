import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(app)/app/productivity/goals/[goalId]/page.tsx", "utf8");

describe("goal detail route validation", () => {
  it("rejects malformed UUIDs before querying PostgreSQL", () => {
    expect(source).toContain("if (!UUID_RE.test(goalId)) notFound()");
    expect(source.indexOf("UUID_RE.test(goalId)")).toBeLessThan(source.indexOf("getPersonalGoal(goalId)"));
  });
});
