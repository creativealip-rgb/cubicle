import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/forms/project-form.tsx", "utf8");

describe("project time tracking form", () => {
  it("exposes and submits timeTrackingMode", () => {
    expect(source).toContain('timeTrackingMode?: "off" | "internal" | "billable"');
    expect(source).toContain("timeTrackingMode: form.timeTrackingMode");
    expect(source).toContain('<SelectItem value="off">');
    expect(source).toContain('<SelectItem value="internal">');
    expect(source).toContain('<SelectItem value="billable">');
  });
});
