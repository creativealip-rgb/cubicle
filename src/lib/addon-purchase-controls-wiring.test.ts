import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const controls = () => read("src/components/billing/addon-purchase-controls.tsx");
const page = () => read("src/app/(app)/app/billing/page.tsx");
const actions = () => read("src/lib/actions/billing-addons.ts");
const component = () => read("src/components/billing/addon-management.tsx");

describe("billing add-on purchase controls wiring", () => {
  it("offers storage add-ons +5/+10/+15 GB priced from the catalog helper", () => {
    const src = controls();
    expect(src).toContain("STORAGE_OPTIONS: StorageAddonKey[] = [5, 10, 15]");
    // Prices must come from the source-of-truth period label helper
    // (billing-plans.test.ts pins 10/20/30rb monthly, ×12 yearly) so UI and
    // checkout can't drift.
    expect(src).toContain("getStorageAddonPeriodLabel(selectedStorage, period, lang)");
    expect(src).toContain("+{gb} GB");
  });

  it("locks add-on purchases to the yearly period (79521193) via the shared BillingPeriod type", () => {
    const src = controls();
    // 79521193 "default addons tab to yearly pricing" deliberately dropped the
    // monthly/yearly toggle in THIS component (the plan checkout keeps its own).
    // Pin the decision so the pricing basis cannot drift back silently.
    expect(src).toContain('const period: BillingPeriod = "yearly";');
    expect(src).not.toContain("loadStoredPeriod()");
    expect(src).not.toContain("persistPeriod(next)");
  });

  it("quotes extra workspace from the period-aware catalog pricing", () => {
    const src = controls();
    expect(src).toContain("getExtraWorkspacePeriodLabel(period, lang)");
  });

  it("gates extra workspace on the effective Team plan, disabled + explained otherwise", () => {
    const src = controls();
    expect(src).toContain('effectivePlan === "team"');
    expect(src).toMatch(/disabled=\{busy \|\| !isTeam\}/);
    // Bilingual explanation when not Team.
    expect(src).toContain('t("Perlu upgrade ke plan Team.", "Requires active Team plan.")');
  });

  it("POSTs same-origin to the correct checkout routes with the selected period", () => {
    const src = controls();
    // Routes are passed to the shared same-origin POST helper.
    expect(src).toContain('startCheckout("/api/billing/checkout"');
    expect(src).toContain('startCheckout("/api/billing/checkout-extra-workspace"');
    expect(src).toContain("const res = await fetch(path, {");
    // The period-selected body is passed to the shared helper and stringified
    // there (single source for both routes).
    expect(src).toContain("{ addon: selectedStorage, period }");
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
    expect(src).toMatch(/storageAddons=\{addons\.storageAddons\}/);
    expect(src).toContain("extraWorkspaceEntitlements={addons.extraWorkspaceEntitlements}");
    expect(src.indexOf("<AddonPurchaseControls")).toBeLessThan(
      src.indexOf("<AddonManagement"),
    );
  });
});

describe("extra-workspace entitlement list wiring", () => {
  it("action exposes per-entitlement rows (not just the aggregate slot count)", () => {
    const src = actions();
    expect(src).toContain("listActiveExtraWorkspaceEntitlements(user.id)");
    expect(src).toContain("extraWorkspaceEntitlements:");
    // The entitlement list helper lives in extra-workspace.ts and returns rows.
    const lib = read("src/lib/extra-workspace.ts");
    expect(lib).toContain("export async function listActiveExtraWorkspaceEntitlements(");
    expect(lib).toMatch(/IN \('active', 'cancel_scheduled'\)/);
  });

  it("billing page passes the entitlement rows to AddonManagement", () => {
    const src = page();
    expect(src).toContain("extraWorkspaceEntitlements={addons.extraWorkspaceEntitlements}");
  });

  it("AddonManagement renders a cancel button per entitlement, disabled when cancel_scheduled", () => {
    const src = component();
    expect(src).toContain("extraWorkspaceEntitlements.map((entitlement) =>");
    expect(src).toContain('entitlement.status === "cancel_scheduled"');
    expect(src).toContain("cancelWorkspace(entitlement.id)");
    expect(src).toContain("entitlement.endsAt.toLocaleDateString()");
    expect(src).toContain('t("Berakhir", "Ends")');
    // Cancel action is user-scoped: the action passes the session user id.
    expect(actions()).toMatch(/cancelExtraWorkspaceEntitlement\(entitlementId,\s*user\.id\)/);
  });
});

// Self-check: source-wiring only, no live DB/provider calls.
// Re-pointed 2026-10-10 after the i18n migration added a `lang` argument to the
// pricing helpers and 79521193 defaulted the add-ons tab to yearly: the pricing
// helpers, Team gate, checkout routes and bodies are all unchanged, so the
// behavioural contracts above were kept and only obsolete anchors replaced.
