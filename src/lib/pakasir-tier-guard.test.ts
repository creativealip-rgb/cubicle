import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const syncSource = readFileSync(
  join(process.cwd(), "src/lib/pakasir-sync.ts"),
  "utf8",
);

// The plan-activation section of the shared helper: from the plan-payment
// comment through the end of the transaction. Add-on branches are excluded.
function planActivationSection() {
  const start = syncSource.indexOf("// Plan payment: activate the plan");
  return syncSource.slice(start);
}

describe("Pakasir activation tier guard: never downgrade a currently effective higher tier", () => {
  it("reads the owner's current plan and expiry inside the locked transaction before updating users.plan", () => {
    const section = planActivationSection();
    // The current user state must come from the SAME transaction client (tx)
    // as the row-locked payment read, so the guard sees the exact state the
    // update will write against.
    expect(section).toMatch(/tx\s*\.select\(\{ plan: users\.plan, planExpiresAt: users\.planExpiresAt \}\)/);
    expect(section).toMatch(/from\(users\)/);
    expect(section.indexOf("tx\n      .select")).toBeLessThan(section.indexOf("tx\n      .update(users)"));
  });

  it("compares effective tiers via getEffectivePlan so the grace period is honored", () => {
    const section = planActivationSection();
    // getEffectivePlan folds in the 3-day grace period: a user whose plan just
    // lapsed still counts as their paid tier, so a stale lower-tier payment
    // cannot sneak a downgrade through during grace.
    expect(section).toContain("getEffectivePlan(owner.plan, owner.planExpiresAt)");
  });

  it("returns ignored/no_downgrade BEFORE any write when the paid tier is lower than the current effective tier", () => {
    const section = planActivationSection();
    const rankGuard = section.indexOf("rank(paidPlan) < rank(currentEffective)");
    const earlyReturn = section.indexOf('status: "no_downgrade"');
    const usersUpdate = section.indexOf("tx\n      .update(users)");
    const paymentUpdate = section.indexOf("tx\n      .update(pakasirPayments)");
    // Guard and early return must precede BOTH the users.plan write and the
    // pending->completed payment transition, so a skipped downgrade leaves the
    // user plan and the payment row untouched (payment stays pending).
    expect(rankGuard).toBeGreaterThan(-1);
    expect(earlyReturn).toBeGreaterThan(-1);
    expect(usersUpdate).toBeGreaterThan(earlyReturn);
    expect(paymentUpdate).toBeGreaterThan(earlyReturn);
  });

  it("allows same-tier renewal and higher-tier upgrade (no early return for equal/higher paid tier)", () => {
    const section = planActivationSection();
    // Only a strictly-lower paid tier short-circuits; equal (renewal) and
    // higher (upgrade) tiers fall through to the users.plan update.
    expect(section).toMatch(/rank\(paidPlan\) < rank\(currentEffective\)/);
    expect(section).not.toMatch(/rank\(paidPlan\) <= rank\(currentEffective\)/);
    expect(section).toMatch(/tx\s*\.update\(users\)/);
  });

  it("keeps add-on branches free of the tier guard (add-ons never touch users.plan)", () => {
    // The guard lives only in the plan-activation branch, AFTER the add-on
    // branches return. Storage/extra-workspace payments must never be blocked
    // by the plan tier guard.
    const guardStart = syncSource.indexOf("// Plan payment: activate the plan");
    const addonBranch = syncSource.indexOf('current.paymentType === "storage_addon"');
    const extraWsBranch = syncSource.indexOf('current.paymentType === "extra_workspace"');
    expect(addonBranch).toBeGreaterThan(-1);
    expect(extraWsBranch).toBeGreaterThan(-1);
    // The tier guard begins after both add-on branches are defined AND after
    // their return statements (the guard start index is past the extra-ws
    // branch's return).
    const extraWsReturn = syncSource.indexOf("kind: \"activated\" as const, plan: current.plan, entitlementId: activated.entitlementId", extraWsBranch);
    expect(guardStart).toBeGreaterThan(extraWsReturn);
  });
});
