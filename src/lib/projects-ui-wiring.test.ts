import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const listTable = readFileSync("src/components/projects/projects-list-table.tsx", "utf8");
const detailPage = readFileSync("src/app/(app)/app/projects/[projectId]/page.tsx", "utf8");
const statusBadge = readFileSync("src/lib/status-badge.tsx", "utf8");
const progressLib = readFileSync("src/lib/project-progress.ts", "utf8");

describe("project list status pills", () => {
  it("uses semantic badge variants with a status dot", () => {
    expect(listTable).toContain("projectListStatusVariant");
    expect(listTable).toContain("projectStatusDot");
    expect(listTable).toContain("StatusPill");
  });

  it("keeps every project status on a semantic mapping", () => {
    for (const status of ["draft", "active", "review", "on_hold", "completed", "cancelled", "archived"]) {
      expect(statusBadge).toContain(`case "${status}"`);
    }
  });

  it("keeps the list table filters wired in header columns", () => {
    expect(listTable).toContain('queryKey="clientId"');
    expect(listTable).toContain('queryKey="status"');
    expect(listTable).toContain('queryKey="billingType"');
  });
});

describe("project progress presentation", () => {
  it("renders an accessible progressbar with an urgency tone", () => {
    expect(listTable).toContain('role="progressbar"');
    expect(listTable).toContain("aria-valuenow");
    expect(listTable).toContain("progressTone");
  });

  it("drives hours labels through the active locale", () => {
    expect(progressLib).toContain("uiLocale(input.lang");
    expect(listTable).toContain("locale");
  });
});

describe("project due-date urgency", () => {
  it("exposes overdue, due-soon, today, done, and muted tones", () => {
    expect(listTable).toContain('return "danger"');
    expect(listTable).toContain('return "warn"');
    expect(listTable).toContain('return "done"');
    expect(listTable).toContain('return "muted"');
    expect(listTable).toContain('return "normal"');
  });

  it("keeps the locale-aware due label with urgency suffix", () => {
    expect(listTable).toContain("toLocaleDateString(locale");
    expect(listTable).toContain('t("lewat", "overdue")');
    expect(listTable).toContain('t("hari ini", "today")');
  });
});

describe("project detail locale consistency", () => {
  it("formats rate, budget, and due date with the active locale", () => {
    expect(detailPage).toContain("const locale = getLocale(lang)");
    expect(detailPage).toContain("Number(project.rate).toLocaleString(locale)");
    expect(detailPage).toContain("Number(project.budget).toLocaleString(locale)");
    expect(detailPage).toContain("toLocaleDateString(locale)");
  });
});
