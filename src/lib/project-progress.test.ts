import { describe, expect, it } from "vitest";
import { getProjectProgress, progressTone, uiLocale } from "./project-progress";

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

describe("project progress locale formatting", () => {
  it("keeps Indonesian hour labels unchanged when lang is id", () => {
    expect(getProjectProgress({ billingType: "hours", totalTasks: 2, doneTasks: 1, trackedMinutes: 750, packageHours: null, lang: "id" })).toEqual({ pct: 50, label: "12,5 jam" });
  });

  it("formats hours with the English locale when lang is en", () => {
    expect(getProjectProgress({ billingType: "hours", totalTasks: 2, doneTasks: 1, trackedMinutes: 750, packageHours: null, lang: "en" })).toEqual({ pct: 50, label: "12.5 jam" });
  });

  it("formats package quota with the English locale when lang is en", () => {
    expect(getProjectProgress({ billingType: "package", totalTasks: 0, doneTasks: 0, trackedMinutes: 900, packageHours: 40, lang: "en" })).toEqual({ pct: 38, label: "15 / 40 jam" });
  });
});

describe("uiLocale", () => {
  it("maps the app languages to BCP-47 locales", () => {
    expect(uiLocale("id")).toBe("id-ID");
    expect(uiLocale("en")).toBe("en-US");
  });
});

describe("progressTone", () => {
  it("flags incomplete work as amber when overdue", () => {
    expect(progressTone(40, true)).toBe("bg-amber-500");
  });

  it("does not flag completed work as overdue", () => {
    expect(progressTone(100, true)).toBe("bg-emerald-600");
  });

  it("falls back to the gradient color for on-track work", () => {
    expect(progressTone(40, false)).toMatch(/^hsl\(/);
    expect(progressTone(40, false)).not.toBe("bg-amber-500");
  });
});
