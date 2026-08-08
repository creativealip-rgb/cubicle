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

  it("keeps client summary at three columns (with portal status stat) and tabs in shared ClientTabsNav", () => {
    expect(clientDetail).toContain('className="grid grid-cols-3 gap-2"');
    expect(clientDetail).toContain('<p className="text-[11px] text-muted-foreground">Portal</p>');
    expect(clientDetail).toContain("<ClientTabsNav");
  });

  it("offers an explicit i18n project currency selector with expanded currencies", () => {
    expect(projectForm).toContain('t("Mata Uang", "Currency")');
    expect(projectForm).toContain('<SelectItem value="IDR">IDR</SelectItem>');
    expect(projectForm).toContain('<SelectItem value="JPY">JPY</SelectItem>');
  });

  it("shows fixed-rate wording with i18n and keeps retired service/activity tabs absent", () => {
    expect(projectDetail).toContain('t("Fixed rate", "Fixed rate")');
    expect(projectDetail).not.toContain('t("Nominal", "Amount")');
    expect(projectDetail).not.toContain('<TabsTrigger value="services"');
    expect(projectDetail).not.toContain('<TabsContent value="services"');
    expect(projectDetail).not.toContain('<TabsTrigger value="activities"');
  });

  it("defaults new tasks to visible while preserving edit values", () => {
    expect(taskForm.match(/clientVisible: defaultValues\?\.clientVisible \?\? mode === "create"/g)).toHaveLength(2);
  });
});
