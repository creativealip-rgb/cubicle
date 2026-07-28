import { describe, expect, it } from "vitest";
import {
  defaultTimeTrackingMode,
  assertProjectAllowsTimeEntry,
  canMutateHistoricalTimeEntry,
  timeEntryBillableForMode,
} from "@/lib/project-time-tracking-policy";

describe("project time tracking policy", () => {
  it("defaults fixed projects to internal and hourly projects to billable", () => {
    expect(defaultTimeTrackingMode({ billingType: "project" })).toBe("internal");
    expect(defaultTimeTrackingMode({ billingType: "hours" })).toBe("billable");
  });

  it("defaults package projects from measurable hour allowance", () => {
    expect(defaultTimeTrackingMode({ billingType: "package", packageHours: 40 })).toBe("billable");
    expect(defaultTimeTrackingMode({ billingType: "package", packageHours: null })).toBe("internal");
    expect(defaultTimeTrackingMode({ billingType: "package", packageHours: 0 })).toBe("internal");
  });

  it("rejects current writes to projects with tracking off", () => {
    expect(() => assertProjectAllowsTimeEntry({ id: "project-off", timeTrackingMode: "off" })).toThrow(
      "Pelacakan waktu dinonaktifkan untuk Project ini",
    );
  });

  it("allows current writes to internal and billable projects", () => {
    expect(() => assertProjectAllowsTimeEntry({ id: "project-internal", timeTrackingMode: "internal" })).not.toThrow();
    expect(() => assertProjectAllowsTimeEntry({ id: "project-billable", timeTrackingMode: "billable" })).not.toThrow();
  });

  it("preserves history as read-only when its project is switched off", () => {
    expect(canMutateHistoricalTimeEntry({ timeTrackingMode: "off" })).toBe(false);
    expect(canMutateHistoricalTimeEntry({ timeTrackingMode: "internal" })).toBe(true);
    expect(canMutateHistoricalTimeEntry({ timeTrackingMode: "billable" })).toBe(true);
  });

  it("derives billing from project tracking mode instead of browser input", () => {
    expect(timeEntryBillableForMode("billable")).toBe(true);
    expect(timeEntryBillableForMode("internal")).toBe(false);
    expect(timeEntryBillableForMode("off")).toBe(false);
  });
});
