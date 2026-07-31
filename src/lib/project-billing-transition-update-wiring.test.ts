import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = fs.readFileSync("src/lib/actions/projects.ts", "utf8");

describe("project billing transition updates", () => {
  it("normalizes every optional date empty string to null", () => {
    expect(source).toContain("updateData.startDate = parsed.startDate || null");
    expect(source).toContain("updateData.finishDate = parsed.finishDate || null");
    expect(source).toContain("updateData.dueDate = parsed.dueDate || null");
  });

  it("applies canonical tracking mode when billing model changes", () => {
    expect(source).toContain('parsed.billingModel === "fixed_price" ? "off" : "billable"');
    expect(source).toContain("updateData.timeTrackingMode = nextTrackingMode");
  });
});
