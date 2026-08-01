import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { billingTypeLabel } from "@/lib/feature-access";

const clientDetail = readFileSync("src/app/(app)/app/clients/[clientId]/page.tsx", "utf8");
const projectDetail = readFileSync("src/app/(app)/app/projects/[projectId]/page.tsx", "utf8");
const projectForm = readFileSync("src/components/forms/project-form.tsx", "utf8");
const taskForm = readFileSync("src/components/forms/task-form.tsx", "utf8");

describe("client and project detail UX", () => {
  it("labels canonical billing models correctly", () => {
    expect(billingTypeLabel("fixed_price", "id")).toBe("Fixed Price");
    expect(billingTypeLabel("hourly", "id")).toBe("Per Jam");
    expect(billingTypeLabel("retainer", "id")).toBe("Retainer");
  });

  it("keeps client summary at two columns and portal in lower tabs", () => {
    expect(clientDetail).toContain('className="grid grid-cols-2 gap-2"');
    expect(clientDetail).not.toContain('<p className="text-[11px] text-muted-foreground">Portal</p>');
    expect(clientDetail).toContain('<TabsTrigger value="portal"');
  });

  it("offers an explicit project currency selector", () => {
    expect(projectForm).toContain("Mata uang");
    expect(projectForm).toContain('<SelectItem value="IDR">IDR</SelectItem>');
  });

  it("shows nominal without fixed-rate wording and keeps retired service/activity tabs absent", () => {
    expect(projectDetail).toContain('t("Nominal", "Amount")');
    expect(projectDetail).not.toContain('t("Fixed rate", "Fixed rate")');
    expect(projectDetail).not.toContain('<TabsTrigger value="services"');
    expect(projectDetail).not.toContain('<TabsContent value="services"');
    expect(projectDetail).not.toContain('<TabsTrigger value="activities"');
  });

  it("defaults new tasks to visible while preserving edit values", () => {
    expect(taskForm.match(/clientVisible: defaultValues\?\.clientVisible \?\? mode === "create"/g)).toHaveLength(2);
  });
});
