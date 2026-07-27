import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/portal/project-accordion.tsx", "utf8");

describe("portal project progress wiring", () => {
  it("uses billing-specific project progress", () => {
    expect(source).toContain("getProjectProgress({");
    expect(source).toContain("packageHours: selectedPkg?.hours ?? null");
  });

  it("keeps task completion secondary for hourly and package work", () => {
    expect(source).toContain("billingProgress.label");
    expect(source).toContain("{done}/{total} tugas selesai");
  });

  it("only derives awaiting closure from task completion for per-project billing", () => {
    expect(source).toContain('project.billingType === "project" &&');
  });

  it("marks active package projects with exhausted quota", () => {
    expect(source).toContain('t("Kuota habis", "Quota exhausted")');
  });

  it("renders hourly and package usage in the right-side metadata", () => {
    expect(source).toContain("billingHoursLabel");
    expect(source).toContain('className="ml-8 flex shrink-0 flex-col items-end gap-2 sm:ml-0"');
  });

  it("does not render percentage progress for package work", () => {
    expect(source).not.toContain("isByPackage && selectedPkg?.hours ? progressPie");
  });

  it("shows project start and target dates from stored project fields", () => {
    expect(source).toContain('t("Mulai", "Start")');
    expect(source).toContain('t("Target selesai", "Target finish")');
    expect(source).toContain("project.startDate");
    expect(source).toContain("project.finishDate");
  });
});
