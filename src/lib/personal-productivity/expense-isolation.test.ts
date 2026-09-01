import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("business and personal expense isolation", () => {
  const business = readFileSync("src/app/(app)/app/expenses/page.tsx", "utf8");
  const personal = readFileSync(
    "src/lib/actions/personal-transactions.ts",
    "utf8",
  );
  it("keeps business KPI and list queries workspace scoped", () => {
    expect(
      business.match(/eq\(expenses\.workspaceId, ws\.id\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(business).not.toContain("personalTransactions.amount");
  });
  it("keeps personal transactions session-user scoped", () => {
    expect(personal).toContain("eq(personalTransactions.userId, id)");
    expect(personal).not.toContain("workspaceId");
  });
});
