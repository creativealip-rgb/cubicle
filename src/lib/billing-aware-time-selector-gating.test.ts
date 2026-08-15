import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { allowsTimeTrackingProject } from "./billing-model";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("billing-aware time selector gating", () => {
  it("allows time selectors only for Hourly and Retainer projects", () => {
    expect(allowsTimeTrackingProject({ billingModel: "hourly", billingType: "hours" })).toBe(true);
    expect(allowsTimeTrackingProject({ billingModel: "retainer", billingType: "hours" })).toBe(true);
    expect(allowsTimeTrackingProject({ billingModel: null, billingType: "hours" })).toBe(true);
    expect(allowsTimeTrackingProject({ billingModel: "fixed_price", billingType: "project" })).toBe(false);
    expect(allowsTimeTrackingProject({ billingModel: null, billingType: "project" })).toBe(false);
    expect(allowsTimeTrackingProject({ billingModel: "legacy_package", billingType: "package" })).toBe(false);
    expect(allowsTimeTrackingProject({ billingModel: null, billingType: "package" })).toBe(false);
    // Unknown / ambiguous values fail closed — never offered for time entry.
    expect(allowsTimeTrackingProject({ billingModel: "other", billingType: "hours" })).toBe(false);
    expect(allowsTimeTrackingProject({ billingModel: null, billingType: null })).toBe(false);
  });

  it("selects Time route projects by canonical billing model, not legacy tracking mode alone", () => {
    const route = read("src/components/time/time-route-content.tsx");
    const timesheet = read("src/components/time/timesheet.tsx");

    expect(route).toContain("billingModel: projects.billingModel");
    expect(route).toContain("allowsTimeTrackingProject(project)");
    expect(timesheet).toContain("allowsTimeTrackingProject(p)");
    // No legacy tracking-mode-only filter may remain (would re-expose Fixed Price).
    expect(route).not.toContain('filter((project) => project.timeTrackingMode !== "off")');
    expect(timesheet).not.toContain('filter((p) => p.timeTrackingMode !== "off")');
  });

  it("keeps historical Fixed Price / legacy Package entries read-only in the UI", () => {
    const timesheet = read("src/components/time/timesheet.tsx");
    expect(timesheet).toContain('billingType === "project" || billingType === "fixed_price" || billingType === "package"');
  });

  it("drops the forbidden Tugas terkait label", () => {
    const widget = read("src/components/time/timer-widget.tsx");
    const manual = read("src/components/time/manual-entry-form.tsx");
    expect(widget).not.toContain("Tugas terkait");
    expect(manual).not.toContain("Tugas terkait");
  });
});
