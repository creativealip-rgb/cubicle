import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("billing-aware Phase 9 cleanup gate", () => {
  it("blocks active Package and Activity mutation actions after destructive cleanup approval", () => {
    const packagesAction = read("src/lib/actions/packages.ts");
    const activitiesAction = read("src/lib/actions/activities.ts");

    expect(packagesAction).toContain("function assertLegacyPackageCleanupWriteBlocked");
    expect(packagesAction).toContain("await assertLegacyPackageCleanupWriteBlocked()");
    expect(packagesAction).toContain("Paket legacy sudah masuk fase cleanup");

    expect(activitiesAction).toContain("function assertLegacyActivityCleanupWriteBlocked");
    expect(activitiesAction).toContain("await assertLegacyActivityCleanupWriteBlocked()");
    expect(activitiesAction).toContain("Aktivitas legacy sudah masuk fase cleanup");
  });

  it("registers destructive cleanup migration with backup and dry-run notes", () => {
    const registry = read("docs/migration-registry.md");
    const audit = read("docs/audits/BILLING_AWARE_PHASE9_DESTRUCTIVE_CLEANUP_20260729.md");
    const migration = read("drizzle/0062_billing_aware_phase9_cleanup.sql");

    expect(registry).toContain("0062");
    expect(registry).toContain("Billing-aware Phase 9 destructive cleanup");
    expect(audit).toContain("Backup");
    expect(audit).toContain("Dry-run");
    expect(audit).toContain("Production: untouched");
    expect(migration).toContain("DROP TABLE IF EXISTS project_activities");
    expect(migration).toContain("DROP TABLE IF EXISTS activities");
    expect(migration).toContain("DROP TABLE IF EXISTS project_package_assignments");
    expect(migration).toContain("DROP TABLE IF EXISTS package_items");
    expect(migration).toContain("DROP TABLE IF EXISTS packages");
    expect(migration).not.toContain("DROP TABLE IF EXISTS services");
    expect(migration).not.toContain("DROP TABLE IF EXISTS project_services");
  });
});
