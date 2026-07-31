import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const navigation = read("src/lib/navigation/app-navigation.ts");
const activityRoute = read("src/app/(app)/app/time/activities/page.tsx");
const serviceRoute = read("src/app/(app)/app/services/page.tsx");
const schema = read("src/db/schema.ts");
const registry = read("docs/migration-registry.md");

describe("legacy Activity and Service UI retirement", () => {
  it("keeps direct Activity and Service entries out of navigation", () => {
    expect(navigation).not.toContain('direct("activities"');
    expect(navigation).not.toContain('direct("services"');
  });

  it("redirects bookmarked catalog routes to canonical destinations", () => {
    expect(activityRoute).toContain('redirect("/app/time")');
    expect(serviceRoute).toContain('redirect("/app/tasks")');
    expect(activityRoute).not.toContain("ActivityCatalog");
    expect(serviceRoute).not.toContain("ServiceCatalog");
  });

  it("preserves compatibility schema and marks destructive cleanup retired", () => {
    expect(schema).toContain("export const activities");
    expect(schema).toContain("export const projectActivities");
    expect(schema).toContain("export const services");
    expect(schema).toContain("export const projectServices");
    expect(registry).toContain("0062 retired");
    expect(registry).not.toContain("0062` — Billing-aware Phase 9 destructive cleanup — Coder — `feat/billing-aware-phase1` — reserved");
  });
});
