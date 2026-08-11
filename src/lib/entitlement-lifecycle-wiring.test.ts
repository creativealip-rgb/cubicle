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
});

// Self-check: this file must remain source-wiring-only; no live DB calls.
