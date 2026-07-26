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
});
