import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const filePath = (path: string) => join(process.cwd(), path);
const read = (path: string) => readFileSync(filePath(path), "utf8");
const readExisting = (path: string) => {
  expect(existsSync(filePath(path)), `${path} should exist`).toBe(true);
  return read(path);
};

describe("Phase 4 Package builder wiring", () => {
  it("adds additive Package item and Project package assignment snapshot schema", () => {
    const schema = read("src/db/schema.ts");
    const migration = readExisting("drizzle/0050_package_builder.sql");

    expect(schema).toContain('allowanceType: text("allowance_type"');
    expect(schema).toContain('allowanceValue: numeric("allowance_value"');
    expect(schema).toContain('lifecycleClass: text("lifecycle_class"');
    expect(schema).toContain('status: text("status", { enum: ["active", "archived"] })');
    expect(schema).toContain('export const packageItems = pgTable("package_items"');
    expect(schema).toContain('export const projectPackageAssignments = pgTable("project_package_assignments"');
    expect(schema).toContain('sourcePackageId: uuid("source_package_id")');
    expect(schema).toContain('priceSnapshot: numeric("price_snapshot"');
    expect(schema).toContain('allowanceTypeSnapshot: text("allowance_type_snapshot"');
    expect(schema).toContain('allowanceValueSnapshot: numeric("allowance_value_snapshot"');
    expect(schema).toContain('projectPackageAssignmentId: uuid("project_package_assignment_id")');
    expect(schema).toContain('packageItems: many(packageItems)');
    expect(schema).toContain('packageAssignment: one(projectPackageAssignments');

    expect(migration).toContain('ALTER TABLE "packages"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "allowance_type" text');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "allowance_value" numeric(12,2)');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "lifecycle_class" text');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "status" text');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "package_items"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "project_package_assignments"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "project_package_assignment_id" uuid');
    expect(migration).toContain('FOREIGN KEY ("package_id", "workspace_id")');
    expect(migration).toContain('FOREIGN KEY ("service_id", "workspace_id")');
    expect(migration).toContain('FOREIGN KEY ("project_id", "workspace_id")');
    expect(migration).toContain('FOREIGN KEY ("source_package_id", "workspace_id")');
    expect(migration).toContain('FOREIGN KEY ("source_package_assignment_id", "workspace_id")');
    expect(migration).toContain("legacy_recurring_unmodeled");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });

  it("builds package catalog from Services and archives without deleting history", () => {
    const actions = readExisting("src/lib/actions/packages.ts");
    const helper = readExisting("src/lib/package-snapshots.ts");
    const catalog = read("src/components/packages/package-catalog.tsx");

    expect(actions).toContain("getWorkspacePackageBuilderData");
    expect(actions).toContain("getPackageItemsByPackageIds");
    expect(actions).toContain("packageItemSchema");
    expect(actions).toContain("upsertPackageItems");
    expect(actions).toContain("assertPackageInWorkspace");
    expect(actions).toContain("eq(packageItems.workspaceId, workspaceId)");
    expect(actions).toContain("inArray(services.id, serviceIds)");
    expect(actions).toContain('status: "archived"');
    expect(actions).not.toContain("db.delete(packages)");
    expect(actions).not.toContain("db.delete(packageItems)");

    expect(helper).toContain("buildProjectPackageSnapshot");
    expect(helper).toContain("buildProjectServiceSnapshotsFromPackage");
    expect(catalog).toContain("includedServices");
    expect(catalog).toContain("selectedServiceIds");
    expect(catalog).toContain("getWorkspacePackageBuilderData");
    expect(catalog).toContain('href="/app/services"');
  });

  it("dual-writes Project Package assignment and included Service snapshots", () => {
    const projectActions = read("src/lib/actions/projects.ts");
    const packageActions = read("src/lib/actions/packages.ts");
    const projectForm = read("src/components/forms/project-form.tsx");


    expect(projectActions).toContain("assignPackageToProject");
    expect(projectActions).toContain("syncProjectPackageAssignment");
    expect(projectActions).toContain("selectedPackageId");
    expect(packageActions).toContain("projectPackageAssignmentId");
    expect(packageActions).toContain("sourcePackageAssignmentId");
    expect(packageActions).toContain("db.transaction");

    expect(packageActions).toContain("assignPackageToProject");
    expect(packageActions).toContain("syncProjectPackageAssignment");
    expect(packageActions).toContain("assertProjectInWorkspace");

    expect(projectForm).toContain("includedServices");
    expect(projectForm).toContain("Layanan dalam paket");
    expect(projectForm).toContain("getWorkspacePackageBuilderData");
    expect(packageActions).toContain("buildProjectServiceSnapshotsFromPackage(items, createdAssignment.id)");
    expect(packageActions).toContain("projectPackageAssignmentId: assignment.id");
  });

  it("moves portal order to server-side Package builder authority and preserves archived order history", () => {
    const action = read("src/lib/actions/package-orders.ts");
    const portalPage = read("src/app/client-portal/[token]/page.tsx");
    const accordion = read("src/components/portal/project-accordion.tsx");

    expect(action).toContain("projectPackageAssignments");
    expect(action).toContain("packageItems");
    expect(action).toContain("getPackageItemsForOrders");
    expect(action).toContain("resolveProjectPackageForPortalOrder");
    expect(action).toContain("eq(projectPackageAssignments.status, \"active\")");
    expect(action).toContain("eq(projectPackageAssignments.workspaceId, client.workspaceId)");
    expect(action).toContain("eq(projects.clientId, client.id)");
    expect(action).toContain("eq(projects.clientVisible, true)");
    expect(action).toContain("packageNameSnapshot");
    expect(action).toContain("priceSnapshot");
    expect(action).toContain("currencySnapshot");
    expect(action).toContain("allowanceValueSnapshot");
    expect(action).toContain("clientPortalToken: null");
    expect(action).not.toContain("resource.packageProjectId !== resource.projectId");

    expect(portalPage).toContain("projectPackageAssignments");
    expect(portalPage).toContain("packageItemsMap");
    expect(portalPage).toContain("packageUsageMap");
    expect(portalPage).toContain("remainingHours");

    expect(accordion).toContain("includedServices");
    expect(accordion).toContain("remainingHours");
    expect(accordion).toContain("Order history");
    expect(accordion).toContain("Paket diarsipkan");
  });
});
