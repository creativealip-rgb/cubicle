import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const actions = () => read("src/lib/actions/billing-addons.ts");
const storage = () => read("src/lib/storage-addons.ts");
const extraWs = () => read("src/lib/extra-workspace.ts");
const webhook = () => read("src/app/api/webhooks/pakasir/route.ts");
const pakasirSync = () => read("src/lib/pakasir-sync.ts");
const checkout = () => read("src/app/api/billing/checkout/route.ts");
const checkoutExtra = () => read("src/app/api/billing/checkout-extra-workspace/route.ts");
const expireCron = () => read("src/app/api/cron/expire-plans/route.ts");

describe("billing add-on server actions", () => {
  it("exposes list + cancel endpoints for both add-on types", () => {
    const src = actions();
    expect(src).toContain("export async function listActiveAddOns(");
    expect(src).toContain("export async function cancelStorageAddOn(");
    expect(src).toContain("export async function cancelExtraWorkspaceAddOn(");
  });

  it("scopes cancel to the session user (helpers filter by userId)", () => {
    const src = actions();
    // The action must pass the authenticated user id into the lib helper so a
    // user can never cancel someone else's add-on.
    expect(src).toMatch(/cancelStorageAddon\(addonId,\s*user\.id\)/);
    expect(src).toMatch(/cancelExtraWorkspaceEntitlement\(entitlementId,\s*user\.id\)/);
    // Listing is user-scoped by the lib helpers.
    expect(src).toContain("listActiveStorageAddons(user.id)");
    expect(src).toContain("getActiveStorageAddonBytes(user.id)");
    expect(src).toContain("getActiveExtraWorkspaceSlots(user.id)");
  });

  it("revalidates the billing page after a cancel", () => {
    const src = actions();
    expect(src).toContain('revalidatePath("/app/billing")');
  });
});

describe("add-on lifecycle wiring (checkout → webhook → cron)", () => {
  it("persists entitlement type and addon key on checkout rows", () => {
    expect(checkout()).toContain('paymentType: "storage_addon"');
    expect(checkout()).toContain("entitlementRef: String(addon)");
    expect(checkout()).toContain("isStorageAddonKey(addonRaw)");
    expect(checkoutExtra()).toContain('paymentType: "extra_workspace"');
  });

  it("webhook + sync cron activate storage and extra-workspace entitlements idempotently", () => {
    // The activation transaction is shared (src/lib/pakasir-sync.ts) so the
    // webhook and the missed-webhook recovery cron can never diverge.
    const shared = pakasirSync();
    expect(shared).toContain("activateStorageAddonTx(tx,");
    expect(shared).toContain("activateExtraWorkspaceEntitlementTx(tx,");
    // Idempotency keys: provider order + event IDs must be passed through.
    expect(shared).toContain("providerOrderId: current.orderId");
    expect(shared).toContain("providerEventId: orderId");
    // Add-on activation never touches the user's plan.
    expect(shared).toContain("// Add-on purchases (storage / extra workspace) reuse the same payment row.");
    // Both callers must go through the shared helper.
    expect(webhook()).toContain("activateCompletedPakasirPayment(payment.id, {");
    expect(read("src/lib/pakasir-sync.ts")).toContain("syncPendingPakasirPayments");
  });

  it("expiry cron sweeps both entitlement types", () => {
    const src = expireCron();
    expect(src).toContain("sweepStorageAddons()");
    expect(src).toContain("sweepExtraWorkspaceEntitlementsTx(tx)");
  });

  it("cancellation keeps entitlement active until period end", () => {
    for (const src of [storage(), extraWs()]) {
      expect(src).toContain('status: "cancel_scheduled"');
      expect(src).toContain("autoRenew: false");
      // Slots/bytes still count until ends_at (no immediate drop).
      expect(src).toMatch(/IN \('active', 'cancel_scheduled'\)/);
    }
  });

  it("expiry sweep is terminal: ended active rows expire, cancel_scheduled rows cancel, nothing renews", () => {
    // QRIS carries no payment mandate, so the sweep must never create a new
    // period: ended active rows go to `expired`, cancel_scheduled rows to
    // `cancelled`, and the sweep body contains no insert at all.
    for (const src of [storage(), extraWs()]) {
      const sweep = src.slice(src.indexOf("export async function sweep"));
      expect(sweep).toContain('"expired"');
      expect(sweep).toContain('"cancelled"');
      expect(sweep).toMatch(/status === "cancel_scheduled" \? "cancelled" : "expired"/);
      expect(sweep).not.toMatch(/\.insert\(/);
      expect(sweep).not.toContain("renewed");
      // Row-lock + conditional update keep parallel sweep runs from
      // double-transitioning a row. drizzle 0.45 `.for("update", { skipLocked: true })`
      // compiles to `FOR UPDATE SKIP LOCKED`; the UPDATE is re-guarded by the
      // still-due status/ends_at so only the winning run counts the transition.
      expect(sweep).toMatch(/\.for\("update", \{ skipLocked: true \}\)/);
      expect(sweep).toMatch(/IN \('active', 'cancel_scheduled'\)/);
      expect(sweep).toMatch(/endsAt} <=/);
      expect(sweep).toMatch(/returning\(\{ id:/);
    }
  });

  it("workspace creation honors extra slots at the boundary", () => {
    const src = extraWs();
    expect(src).toContain("canCreateWorkspaceWithAddons");
    expect(src).toContain("getActiveExtraWorkspaceSlots(userId, now)");
    expect(src).toMatch(/count >= baseLimit \+ extraSlots/);
    // Enforcement hook is wired into createWorkspace.
    const ws = read("src/lib/actions/workspace-switch.ts");
    expect(ws).toContain("canCreateWorkspaceWithAddons(userId)");
  });

  it("counts OWNED workspaces, not memberships, for the workspace slot limit", () => {
    const src = extraWs();
    // Plan limit is an ownership limit: membership in other people's
    // workspaces must not consume the user's own workspace slots.
    expect(src).toContain("workspaces.ownerId, userId");
    expect(src).not.toContain("workspaceMembers.userId, userId");
  });

  it("workspace-switch UI uses the same add-on-aware ownership check as createWorkspace", () => {
    const ws = read("src/lib/actions/workspace-switch.ts");
    // getUserWorkspaces must not fall back to the old membership-count check
    // that ignores purchased extra slots.
    expect(ws).toContain("canCreateWorkspaceWithAddons(userId)");
    expect(ws).not.toContain("canCreateWorkspace(userId)");
  });
});

describe("workspace storage quota cancel_scheduled inclusion", () => {
  it("getWorkspaceStorageQuota counts cancel_scheduled add-ons until period end", () => {
    const src = read("src/lib/storage-quota.ts");
    // Cancel must not drop the workspace maxBytes mid-paid-period: the same
    // status set used by getActiveStorageAddonBytes applies here.
    expect(src).toMatch(/userStorageAddons\.status\} IN \('active', 'cancel_scheduled'\)/);
    expect(src).not.toMatch(/userStorageAddons\.status = 'active'/);
    expect(src).toContain("endsAt} > now()");
  });
});

// Self-check: this file must remain source-wiring-only; no live DB calls.
