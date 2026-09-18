import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("UI consistency convergence", () => {
  it("keeps semantic dashboard and time KPI copy truthful", () => {
    const dashboard = source("src/app/(app)/app/dashboard/page.tsx");
    const time = source("src/components/time/time-route-content.tsx");
    expect(dashboard).toContain('href="/app/activities"');
    expect(dashboard).toContain('t("Lihat Semua Aktivitas", "View All Activity")');
    expect(dashboard).toContain("formatEntityType");
    expect(time).toContain('totalPeriodMinutes > 0 ? `${billableRate}%` : "—"');
  });

  it("preserves picker focus consistently", () => {
    const weekly = source("src/components/time/weekly-time-grid.tsx");
    expect(weekly.match(/onOpenAutoFocus=\{\(event\) => event\.preventDefault\(\)\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps shared headers and mobile KPI grids compact", () => {
    const header = source("src/components/ui/page-header.tsx");
    expect(header).toContain("line-clamp-2");
    expect(header).toContain("sm:truncate");
    expect(source("src/app/(app)/app/dashboard/page.tsx")).toContain("grid-cols-2");
    expect(source("src/components/time/time-route-content.tsx")).toContain("grid-cols-2");
  });

  it("localizes billing and recurring invoice controls", () => {
    const checkout = source("src/components/billing/checkout-button.tsx");
    const recurring = source("src/components/invoices/recurring-invoice-manager.tsx");
    expect(checkout).toContain("useT()");
    expect(checkout).toContain('t("Plan aktif", "Current plan")');
    expect(recurring).toContain("frequencyLabel");
    expect(recurring).toContain('aria-label={t("Aksi invoice berulang", "Recurring invoice actions")}');
  });

  it("uses app confirmations for destructive list actions", () => {
    expect(source("src/components/admin/marketing-spend-manager.tsx")).not.toContain("window.confirm(");
    expect(source("src/components/questionnaires/delete-questionnaire-button.tsx")).not.toContain("window.confirm(");
  });
});
