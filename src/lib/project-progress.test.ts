import { describe, expect, it } from "vitest";
import { getProjectProgress } from "./project-progress";

describe("getProjectProgress", () => {
  it("shows task percentage for by-project work", () => {
    expect(getProjectProgress({ billingType: "project", totalTasks: 4, doneTasks: 1, trackedMinutes: 0, packageHours: null })).toEqual({ pct: 25, label: "25%" });
  });

  it("shows tracked hours for by-hours work", () => {
    expect(getProjectProgress({ billingType: "hours", totalTasks: 4, doneTasks: 2, trackedMinutes: 750, packageHours: null })).toEqual({ pct: 50, label: "12,5 jam" });
  });

  it("shows tracked and allocated hours for package work", () => {
    expect(getProjectProgress({ billingType: "package", totalTasks: 0, doneTasks: 0, trackedMinutes: 900, packageHours: 40 })).toEqual({ pct: 38, label: "15 / 40 jam" });
  });

  it("caps package bar at 100 percent while preserving overtime label", () => {
    expect(getProjectProgress({ billingType: "package", totalTasks: 0, doneTasks: 0, trackedMinutes: 3000, packageHours: 40 })).toEqual({ pct: 100, label: "50 / 40 jam" });
  });
});
