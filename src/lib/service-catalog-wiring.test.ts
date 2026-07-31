import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const filePath = (path: string) => join(process.cwd(), path);
const read = (path: string) => readFileSync(filePath(path), "utf8");
const readExisting = (path: string) => {
  expect(existsSync(filePath(path)), `${path} should exist`).toBe(true);
  return read(path);
};

describe("Phase 3 Service catalog wiring", () => {
  it("adds additive tenant-safe Service, Service Category, and Project Service snapshot schema", () => {
    const schema = read("src/db/schema.ts");
    const migration = readExisting("drizzle/0049_service_catalog.sql");

    expect(schema).toContain('export const serviceCategories = pgTable("service_categories"');
    expect(schema).toContain('export const services = pgTable("services"');
    expect(schema).toContain('export const projectServices = pgTable("project_services"');
    expect(schema).toContain('normalizedName: text("normalized_name")');
    expect(schema).toContain('defaultPricingModel: text("default_pricing_model"');
    expect(schema).toContain('pricingModelSnapshot: text("pricing_model_snapshot"');
    expect(schema).toContain('currencySnapshot: text("currency_snapshot")');
    expect(schema).toContain('projectServiceId: uuid("project_service_id")');
    expect(schema).toContain("projectServices");

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "service_categories"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "services"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "project_services"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "project_service_id" uuid');
    expect(migration).toContain('FOREIGN KEY ("project_id", "workspace_id")');
    expect(migration).toContain('FOREIGN KEY ("service_id", "workspace_id")');
    expect(migration).toMatch(/ON DELETE (SET NULL|RESTRICT)/);
    expect(migration).toContain("lower(btrim(name))");
    expect(migration).toContain("WHERE status = 'active'");
    expect(migration).not.toMatch(/INSERT\s+INTO\s+"?services"?[\s\S]*FROM\s+"?packages"?/i);
  });

  it("scopes Service CRUD to workspace and archives catalog rows instead of deleting historical snapshots", () => {
    const actions = readExisting("src/lib/actions/services.ts");

    expect(actions).toContain("getWorkspaceServices");
    expect(actions).toContain("createService");
    expect(actions).toContain("updateService");
    expect(actions).toContain("archiveService");
    expect(actions).toContain("getServiceCategories");
    expect(actions).toContain("createServiceCategory");
    expect(actions).toContain("assertWorkspaceMember");
    expect(actions).toContain("assertWorkspaceWritable");
    expect(actions).toContain("eq(services.workspaceId, workspaceId)");
    expect(actions).toContain('status: "archived"');
    expect(actions).toContain("projectServices");
    expect(actions).not.toContain("db.delete(services)");
  });

  it("snapshots Project Services from catalog data and validates workspace membership", () => {
    const actions = readExisting("src/lib/actions/services.ts");
    const helper = readExisting("src/lib/service-snapshots.ts");

    expect(actions).toContain("getProjectServices");
    expect(actions).toContain("setProjectServices");
    expect(actions).toContain("syncProjectServiceSnapshots");
    expect(actions).toContain("assertProjectInWorkspace");
    expect(actions).toContain("inArray(services.id, serviceIds)");
    expect(actions).toContain("db.transaction");
    expect(actions).toContain("nameSnapshot");
    expect(actions).toContain("pricingModelSnapshot");
    expect(actions).toContain("currencySnapshot");
    expect(actions).toContain("sourcePackageAssignmentId");
    expect(helper).toContain("buildProjectServiceSnapshot");
    expect(helper).toContain("normalizeCatalogName");
  });

  it("exposes canonical /app/services and keeps /app/packages as Package surface", () => {
    const servicePage = readExisting("src/app/(app)/app/services/page.tsx");
    const serviceCatalog = readExisting("src/components/services/service-catalog.tsx");
    const packagePage = read("src/app/(app)/app/packages/page.tsx");
    const packageCatalog = read("src/components/packages/package-catalog.tsx");
    const navigation = read("src/lib/navigation/app-navigation.ts");

    expect(servicePage).toContain("getWorkspaceServices");
    expect(servicePage).toContain("ServiceCatalog");
    expect(serviceCatalog).toContain("createService");
    expect(serviceCatalog).toContain("archiveService");
    expect(serviceCatalog).toContain("pricingModel");
    expect(navigation).not.toContain('direct("services", "/app/services"');
    expect(navigation).not.toContain('direct("packages", "/app/packages"');

    expect(packagePage).toContain("PackageCatalog");
    expect(packageCatalog).toContain('t("Paket", "Packages")');
    expect(packageCatalog).toContain('t("Paket Baru", "New Package")');
    expect(packageCatalog).not.toContain('t("Service", "Services")');
    expect(packageCatalog).not.toContain('t("Service Baru", "New Service")');
  });

  it("preserves Project Service snapshots outside the simplified canonical Project form", () => {
    const projectActions = read("src/lib/actions/projects.ts");
    const projectForm = read("src/components/forms/project-form.tsx");
    const projectPage = read("src/app/(app)/app/projects/[projectId]/page.tsx");
    const projectServiceSettings = readExisting("src/components/projects/project-service-settings.tsx");

    expect(projectActions).toContain("serviceIds: z.array(z.string().uuid()).optional()");
    expect(projectActions).toContain("syncProjectServiceSnapshots");
    expect(projectForm).not.toContain("getWorkspaceServices");
    expect(projectForm).not.toContain('<Label>Service</Label>');
    expect(projectForm).not.toContain('href="/app/services"');
    expect(projectForm).not.toContain("Layanan Project");
    expect(projectPage).not.toContain("ProjectServiceSettings");
    expect(projectPage).not.toContain('TabsTrigger value="services"');
    expect(projectPage).not.toContain('TabsContent value="services"');
    expect(projectServiceSettings).toContain("setProjectServices");
    expect(projectServiceSettings).toContain("getWorkspaceServices");
    expect(projectServiceSettings).toContain("unitPriceOverride");
    expect(projectServiceSettings).toContain("includedAllowance");
  });
});
