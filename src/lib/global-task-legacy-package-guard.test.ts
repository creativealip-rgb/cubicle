import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/app/tasks/page.tsx", "utf8");

describe("global Tasks legacy Package guard", () => {
  it("keeps legacy Package projects out of writable task options without hiding task reads", () => {
    expect(page).toContain("writableProjectRows");
    expect(page).toContain('resolveBillingModel(project) !== "legacy_package"');
    expect(page).toContain("const taskProjects = writableProjectRows.map");
    expect(page).toContain("const taskList = await db.select");
  });
});
