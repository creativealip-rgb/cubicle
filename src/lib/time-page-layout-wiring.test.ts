import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(app)/app/time/page.tsx", "utf8");
const timer = readFileSync("src/components/time/timer-widget.tsx", "utf8");
const teamTimesheet = readFileSync("src/components/time/team-timesheet-view.tsx", "utf8");

describe("time page layout polish", () => {
  it("places manual entry, timer, and pdf actions in page header", () => {
    expect(page).toContain("ManualEntryForm");
    expect(page).toContain("TimerWidget");
    expect(page).toContain("PdfExportButton");
    expect(page).toContain("app-page-header");
    expect(page).toContain("time-header-actions");
  });

  it("supports compact/header timer action separate from full timer panel", () => {
    expect(timer).toContain("variant?:");
    expect(timer).toContain("header");
    expect(timer).toContain("Mulai Timer");
  });

  it("styles daily/weekly tabs with shared filter-tab look", () => {
    expect(teamTimesheet).toContain("Harian");
    expect(teamTimesheet).toContain("Mingguan");
    expect(teamTimesheet).toMatch(/rounded-(lg|xl|full)[\s\S]*bg-muted/);
  });

  it("styles weekly date selector like daily date pill", () => {
    expect(teamTimesheet).toContain("Minggu ini");
    expect(teamTimesheet).toContain("inline-flex items-center rounded-lg border bg-background");
    expect(teamTimesheet).toContain("border-x");
    expect(teamTimesheet).toContain("border-l");
  });
});
