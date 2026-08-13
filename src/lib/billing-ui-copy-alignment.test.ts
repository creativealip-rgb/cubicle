import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const pricing = () => read("src/lib/billing-pricing.ts");
const checkoutButton = () => read("src/components/billing/checkout-button.tsx");
const controls = () => read("src/components/billing/addon-purchase-controls.tsx");
const topbar = () => read("src/components/app-topbar.tsx");
const billingPage = () => read("src/app/(app)/app/billing/page.tsx");
const clientsPage = () => read("src/app/(app)/app/clients/page.tsx");
const projectsPage = () => read("src/app/(app)/app/projects/page.tsx");
const docsPage = () => read("src/app/(app)/app/docs/workspace-settings/page.tsx");
const landing = () => read("src/app/page.tsx");

describe("billing UI/copy alignment", () => {
  it("single shared period storage key + client-safe helpers live in billing-pricing", () => {
    const src = pricing();
    expect(src).toContain('PERIOD_STORAGE_KEY = "cubiqlo:billing:period"');
    expect(src).toContain("export function loadStoredPeriod(");
    expect(src).toContain("export function persistPeriod(");
    expect(src).toContain("export function formatRupiah(");
    // No "use server" directive / server-only imports: client components must
    // be able to import this module. (Check the directive statement form —
    // a bare mention in a doc comment is not a directive.)
    expect(src).not.toContain('"use server";');
    expect(src).not.toContain("next/");
    expect(src).not.toContain("drizzle");
  });

  it("checkout button shows the exact amount for the selected period (no fake discount)", () => {
    const src = checkoutButton();
    expect(src).toContain("getPlanPeriodLabel(plan, \"monthly\")");
    expect(src).toContain("getPlanPeriodLabel(plan, \"yearly\")");
    // The visible price always matches the period POSTed to the checkout route.
    expect(src).toContain("body: JSON.stringify({ plan, period })");
    // No discount/savings framing anywhere.
    expect(src).not.toMatch(/hemat|diskon|discount|2x|saving/i);
  });

  it("checkout button and add-on controls share the same period helpers", () => {
    const btn = checkoutButton();
    const addon = controls();
    for (const src of [btn, addon]) {
      expect(src).toContain("loadStoredPeriod()");
      expect(src).toContain("persistPeriod(next)");
    }
    // Exact amount labels for the selected period on both.
    expect(addon).toContain("getStorageAddonPeriodLabel(gb, period)");
    expect(addon).toContain("getExtraWorkspacePeriodLabel(period)");
  });

  it("no stale abbreviated prices or fake discount copy remain in scoped UI files", () => {
    const sources = [
      billingPage(),
      topbar(),
      clientsPage(),
      projectsPage(),
      docsPage(),
      landing(),
      checkoutButton(),
      controls(),
    ].join("\n");
    expect(sources).not.toMatch(/Rp\s*\d+rb|Rp\s*[\d.,]+jt|588|1,188|1\.188|hemat|diskon/i);
  });

  it("scoped pages show exact amounts via shared helpers", () => {
    expect(topbar()).toContain("getPlanYearlyLabel(BILLING_PLANS.solo)");
    expect(topbar()).toContain("getPlanYearlyLabel(BILLING_PLANS.team)");
    expect(clientsPage()).toContain("getPlanYearlyLabel(BILLING_PLANS.solo)");
    expect(projectsPage()).toContain("getPlanYearlyLabel(BILLING_PLANS.solo)");
    expect(docsPage()).toContain("getPlanYearlyLabel(BILLING_PLANS.solo)");
    expect(docsPage()).toContain("getPlanYearlyLabel(BILLING_PLANS.team)");
    expect(billingPage()).not.toContain("getPlanPeriodLabel(plan.key, \"yearly\")");
    expect(billingPage()).toContain("getPlanPeriodLabel(plan.key, \"monthly\")");
  });

  it("billing page offers the period toggle on every paid plan card", () => {
    const src = billingPage();
    // Both Solo and Team get the visible monthly/yearly toggle.
    expect(src).toContain("<CheckoutButton plan={plan.key} disabled={isCurrent}>");
    expect(src).not.toContain("showPeriodToggle");
  });

  it("does not claim storage usage anywhere in the scoped billing UI", () => {
    const sources = [
      checkoutButton(),
      controls(),
      billingPage(),
      topbar(),
    ].join("\n");
    // No "storage used / terpakai" claims — storage quota wiring is not part
    // of this phase's UI scope.
    expect(sources).not.toMatch(/terpakai|storage used|storage usage|used storage/i);
  });
});
