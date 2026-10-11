import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/forms/project-form.tsx", "utf8");

describe("project time tracking form", () => {
  it("exposes and submits timeTrackingMode derived from the billing model", () => {
    expect(source).toContain('timeTrackingMode?: "off" | "internal" | "billable"');
    expect(source).toContain("timeTrackingMode: form.timeTrackingMode");
    // Hourly projects track billable time; fixed-price projects do not.
    expect(source).toContain('timeTrackingMode: value === "hourly" ? "billable" : "off"');
  });
});
