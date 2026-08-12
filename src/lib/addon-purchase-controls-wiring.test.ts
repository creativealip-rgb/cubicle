import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const controls = () => read("src/components/billing/addon-purchase-controls.tsx");
const page = () => read("src/app/(app)/app/billing/page.tsx");

describe("billing add-on purchase controls wiring", () => {
  it("offers storage add-ons +5/+10/+15 GB priced yearly from the catalog helper", () => {
    const src = controls();
    expect(src).toContain("STORAGE_OPTIONS: StorageAddonKey[] = [5, 10, 15]");
    // Prices must come from the source-of-truth helper (billing-plans.test.ts
    // pins 10/20/30rb monthly, ×12 yearly) so UI and checkout can't drift.
    expect(src).toContain("getStorageAddonAmount(gb, \"yearly\")");
    expect(src).toContain("+{gb} GB");
  });

  it("uses the product-wide yearly billing period", () => {
    const src = controls();
    expect(src).toContain('const period: BillingPeriod = "yearly"');
  });

  it("quotes extra workspace from yearly catalog pricing", () => {
    const src = controls();
    expect(src).toContain("getExtraWorkspaceAmount(\"yearly\")");
  });

  it("gates extra workspace on the effective Team plan, disabled + explained otherwise", () => {
    const src = controls();
    expect(src).toContain('effectivePlan === "team"');
    expect(src).toMatch(/disabled=\{busy \|\| !isTeam\}/);
    // Bilingual explanation when not Team.
    expect(src).toContain("Hanya tersedia untuk plan Team");
    expect(src).toContain("Only available on the Team plan");
  });

  it("POSTs same-origin to the correct checkout routes with the selected period", () => {
    const src = controls();
    // Routes are passed to the shared same-origin POST helper.
    expect(src).toContain('startCheckout("/api/billing/checkout"');
    expect(src).toContain('startCheckout("/api/billing/checkout-extra-workspace"');
    expect(src).toContain("const res = await fetch(path, {");
    // The period-selected body is passed to the shared helper and stringified
    // there (single source for both routes).
    expect(src).toContain("{ addon: gb, period }");
    expect(src).toContain("{ period }");
    expect(src).toContain("body: JSON.stringify(body),");
  });

  it("handles 403/409/503 safely and disables all buttons while pending", () => {
    const src = controls();
    // Server error message surfaced; 503 adds a retry hint.
    expect(src).toContain("res.status === 503");
    expect(src).toContain("Coba lagi nanti");
    expect(src).toContain("Try again later");
    expect(src).toMatch(/json\.error === "string"/);
    // Every purchase button is disabled while any checkout is in flight.
    expect(src).toContain("const busy = pending !== null;");
    expect(src).toMatch(/disabled=\{busy\}/);
    expect(src).toMatch(/disabled=\{busy \|\| !isTeam\}/);
  });

  it("redirects to the provider payment URL from the same-origin response", () => {
    const src = controls();
    expect(src).toContain("window.location.assign(json.data.paymentUrl)");
  });
});

describe("billing page wiring", () => {
  it("renders purchase controls with the effective plan from the server", () => {
    const src = page();
    expect(src).toContain("import { AddonPurchaseControls }");
    expect(src).toContain("<AddonPurchaseControls effectivePlan={effectivePlan} />");
    // Effective plan is computed server-side via getEffectivePlan (expiry +
    // grace aware) — the client only receives the resolved tier.
    expect(src).toContain("getEffectivePlan(user?.plan, user?.planExpiresAt)");
  });

  it("keeps the add-on management (list/cancel) wired alongside purchase controls", () => {
    const src = page();
    expect(src).toContain("<AddonManagement storageAddons={addons.storageAddons}");
    expect(src.indexOf("<AddonPurchaseControls")).toBeLessThan(
      src.indexOf("<AddonManagement"),
    );
  });
});

// Self-check: source-wiring only, no live DB/provider calls.
