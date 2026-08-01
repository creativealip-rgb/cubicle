import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const time = readFileSync("src/lib/actions/time.ts", "utf8");
const policy = readFileSync("src/lib/time-task-eligibility-db.ts", "utf8");
const activeRoute = readFileSync("src/app/api/time/active/route.ts", "utf8");

describe("Time task eligibility", () => {
  it("requires an active reusable task for new Hourly and Retainer writes", () => {
    expect(policy).toContain("assertTimeTaskEligible");
    expect(policy).toContain('model === "hourly" || model === "retainer"');
    expect(policy).toContain('eq(tasks.mode, "reusable")');
    expect(policy).toContain('eq(tasks.lifecycle, "active")');
    expect(policy).toContain("eq(tasks.projectId, projectId)");
    expect(policy).toContain("eq(tasks.workspaceId, workspaceId)");
    expect(time).toContain('stage: "manual"');
    expect(time).toContain('stage: "weekly"');
  });

  it("checks timer completion before stop mutations", () => {
    const guard = time.indexOf('stage: "completion"');
    const transaction = time.indexOf("const [updated] = await db.transaction", guard);
    expect(guard).toBeGreaterThan(-1);
    expect(transaction).toBeGreaterThan(guard);
  });

  it("preserves historical edits when project and task context stay unchanged", () => {
    expect(time).toContain("const timeContextChanged");
    expect(time).toContain("if (timeContextChanged)");
    expect(time).toContain('stage: "edit"');
  });

  it("only returns active reusable tasks in active timer options", () => {
    expect(activeRoute).toContain('eq(tasks.mode, "reusable")');
    expect(activeRoute).toContain('eq(tasks.lifecycle, "active")');
  });
});
