import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(app)/app/projects/[projectId]/page.tsx", "utf8");
const tabs = readFileSync("src/components/projects/project-tabs-nav.tsx", "utf8");
const overview = readFileSync("src/components/projects/project-overview.tsx", "utf8");
const actions = readFileSync("src/components/projects/project-header-actions.tsx", "utf8");
const editDialog = readFileSync("src/components/projects/project-edit-dialog.tsx", "utf8");

describe("project control center", () => {
  it("defaults to overview and keeps operational tabs", () => {
    expect(page).toContain('initialTab = tabParam && allowedTabs.has(tabParam) ? tabParam : "overview"');
    expect(tabs).toContain('value="overview"');
    for (const value of ["work", "files", "time", "billing"]) expect(tabs).toContain(`value="${value}"`);
  });
  it("shows project health and recent records", () => {
    expect(page).toContain("<ProjectOverview");
    for (const text of [
      't("Jam Tercatat", "Tracked Hours")',
      't("Progres Tugas", "Task Progress")',
      't("Belum Dibayar", "Outstanding")',
      't("Detail Proyek", "Project Details")',
      't("Log Waktu Terbaru", "Recent Time Logs")',
      't("Berkas Terbaru", "Recent Files")',
    ]) expect(overview).toContain(text);
    expect(page).toContain("<ProjectOverview");
  });
  it("keeps details and billing actions in aligned card footers", () => {
    expect(page).toContain("editAction={<ProjectEditDialog");
    expect(overview).toContain("{editAction}");
    expect(overview).toContain("mt-auto border-t pt-3");
  });
  it("uses canonical KPI icons and card surfaces across operational tabs", () => {
    expect(overview).toContain("Clock3");
    expect(overview).toContain('rounded-lg bg-primary/10 text-primary');
    expect(tabs).toContain('text-xs font-medium sm:text-sm');
    expect(overview).toContain("rounded-xl");
  });
  it("opens separate focused dialogs for details and billing settings", () => {
    expect(page).toContain('section="general"');
    expect(page).toContain('section="billing"');
    expect(editDialog).toContain('section?: "general" | "billing"');
    expect(editDialog).toContain('section === "billing" ? t("Pengaturan Billing", "Billing Settings")');
  });
  it("keeps progress only in KPI and separates billing settings from invoices", () => {
    expect(page).not.toContain("Integrated Progress Bar in Header Footer");
    expect(overview).toContain('t("Belum ada tugas", "No tasks yet")');
    expect(overview).toContain('t("Pengaturan Billing", "Billing Settings")');
    expect(overview).toContain('t("Progres Invoice", "Invoice Progress")');
    expect(page).toContain('t("Ubah pengaturan billing", "Edit billing settings")');
  });
  it("keeps administrative actions in overflow", () => {
    expect(page).toContain("<ProjectHeaderActions");
    for (const text of ['t("Lihat Laporan","View Report")', "Buka Portal Klien", "Arsipkan"]) expect(actions).toContain(text);
  });
});
