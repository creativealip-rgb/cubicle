import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const page = read("src/app/(app)/app/projects/[projectId]/page.tsx");

describe("project detail billing-aware work tabs", () => {
  it("uses shared project task workspace under canonical Tugas tab", () => {
    expect(page).toContain('ProjectTaskWorkspace');
    expect(page).toContain('<TabsTrigger value="work"');
    expect(page).toContain('t("Tugas", "Tasks")');
    expect(page).toContain('<TabsContent value="work"');
  });

  it("preserves conditional Time and consolidates commercial data under Billing", () => {
    expect(page).toContain("showTimeTab");
    expect(page).toContain('<TabsTrigger value="billing"');
    expect(page).toContain("ProjectBillingTab");
    expect(page).toContain("invoices.workspaceId");
    expect(page).toContain("invoices.projectId");
  });

  it("removes standalone Service UI without deleting compatibility backend", () => {
    expect(page).not.toContain("ProjectServiceSettings");
    expect(page).not.toContain('<TabsTrigger value="services"');
    expect(page).not.toContain('<TabsContent value="services"');
    expect(read("src/lib/actions/services.ts")).toContain("setProjectServices");
    expect(read("src/db/schema.ts")).toContain("export const projectServices");
  });
});
