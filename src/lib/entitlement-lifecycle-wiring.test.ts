import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("entitlement lifecycle wiring", () => {
  it("runs both entitlement sweeps from expiry cron", () => {
    const source = read("src/app/api/cron/expire-plans/route.ts");
    expect(source).toContain("sweepStorageAddons()");
    expect(source).toContain("sweepExtraWorkspaceEntitlementsTx");
    expect(source).toContain("verifyCronRequest");
  });

  it("supports storage add-on payment metadata", () => {
    const schema = read("src/db/schema.ts");
    const migration = read("drizzle/0073_storage_addon_payment_metadata.sql");
    expect(schema).toContain('"storage_addon"');
    expect(schema).toContain("entitlementRef");
    expect(migration).toContain('"entitlement_ref"');
    expect(migration).toContain("'storage_addon'");
  });

  it("keeps cancellation at period end and renewals idempotent", () => {
    const storage = read("src/lib/storage-addons.ts");
    const workspace = read("src/lib/extra-workspace.ts");
    for (const source of [storage, workspace]) {
      expect(source).toContain('status: "cancel_scheduled"');
      expect(source).toContain("getPeriodExpiry");
      expect(source).toContain("providerEventId");
      expect(source).toContain("providerOrderId");
    }
  });

  it("0077 migration flips auto_renew default to false and backfills both entitlement tables", () => {
    const schema = read("src/db/schema.ts");
    const migration = read("drizzle/0077_disable_unfunded_addon_autorenew.sql");
    // Schema expects DEFAULT false on BOTH tables; the corrective migration must
    // match that for future rows and backfill existing rows (no unfunded renewal).
    expect(
      migration.match(/ALTER TABLE "user_storage_addons"[\s\S]*?ALTER COLUMN "auto_renew" SET DEFAULT false/),
    ).not.toBeNull();
    expect(
      migration.match(/ALTER TABLE "user_extra_workspace_entitlements"[\s\S]*?ALTER COLUMN "auto_renew" SET DEFAULT false/),
    ).not.toBeNull();
    expect(migration.match(/SET "auto_renew" = false/g)?.length).toBe(2);
    // Every entitlement table must refuse auto-renew; 0070/0072 are the only two
    // that were created DEFAULT true and are the ones this migration corrects.
    // Assert the invariant, not a brittle count (a 3rd/4th table must not default true).
    expect(schema).not.toMatch(/autoRenew: boolean\("auto_renew"\)\.notNull\(\)\.default\(true\)/);
    const allAutoRenew = schema.match(/autoRenew: boolean\("auto_renew"\)[^,]*default\((?:true|false)\)/g) ?? [];
    const allFalse = allAutoRenew.filter((d) => d.endsWith("default(false)"));
    expect(allAutoRenew.length).toBeGreaterThanOrEqual(2);
    expect(allFalse.length).toBe(allAutoRenew.length);
    // 0070/0072 are the two legacy tables the corrective migration must undo.
    expect(read("drizzle/0070_storage_entitlements.sql")).toContain('"auto_renew" boolean NOT NULL DEFAULT true');
    expect(read("drizzle/0072_extra_workspace_entitlements.sql")).toContain('"auto_renew" boolean NOT NULL DEFAULT true');
  });
});

// Self-check: this file must remain source-wiring-only; no live DB calls.
