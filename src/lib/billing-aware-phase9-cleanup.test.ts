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

  it("keeps destructive cleanup retired while runtime still uses legacy schema", () => {
    const registry = read("docs/migration-registry.md");
    const audit = read("docs/audits/BILLING_AWARE_PHASE9_DESTRUCTIVE_CLEANUP_20260729.md");
    const migration = read("drizzle/0062_billing_aware_phase9_cleanup.sql");
    const runner = read("scripts/migrate-ledger.sh");
    const schema = read("src/db/schema.ts");

    expect(registry).toContain("0062");
    expect(registry).toContain("Billing-aware Phase 9 destructive cleanup");
    expect(audit).toContain("Backup");
    expect(audit).toContain("Dry-run");
    expect(audit).toContain("Production: untouched");
    expect(migration).toContain("DROP CONSTRAINT IF EXISTS project_services_package_item_workspace_fk");
    expect(migration).toContain("DROP CONSTRAINT IF EXISTS project_services_project_package_assignment_workspace_fk");
    expect(migration).toContain("DROP COLUMN IF EXISTS package_item_id");
    expect(migration).toContain("DROP TABLE IF EXISTS project_activities");
    expect(migration).toContain("DROP TABLE IF EXISTS activities");
    expect(migration).toContain("DROP TABLE IF EXISTS project_package_assignments");
    expect(migration).toContain("DROP TABLE IF EXISTS package_items");
    expect(migration).toContain("DROP TABLE IF EXISTS packages");
    expect(migration).not.toContain("DROP TABLE IF EXISTS services");
    expect(migration).not.toContain("DROP TABLE IF EXISTS project_services");
    expect(runner).toContain("RETIRED_MIGRATIONS");
    expect(runner).toContain("0062_billing_aware_phase9_cleanup.sql");
    expect(schema).toContain('export const activities = pgTable("activities"');
    expect(schema).toContain('export const packages = pgTable("packages"');
    expect(schema).toContain('activityId: uuid("activity_id")');
    expect(schema).toContain('selectedPackageId: uuid("selected_package_id")');
  });
});
