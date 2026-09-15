import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync("src/components/forms/project-form.tsx", "utf8");
const projectsDocs = readFileSync("src/app/(app)/app/docs/[slug]/page.tsx", "utf8");
const gettingStarted = readFileSync("src/app/(app)/app/docs/getting-started/page.tsx", "utf8");

describe("project create billing options", () => {
  it("offers retainer only while editing an existing retainer", () => {
    expect(form).toContain('mode === "edit" && defaultValues?.billingModel === "retainer" && <SelectItem value="retainer">Retainer</SelectItem>');
    expect(form).not.toContain('\n                  <SelectItem value="retainer">Retainer</SelectItem>');
  });

  it("documents fixed price and hourly as new-project options", () => {
    expect(projectsDocs).toContain("Dua model billing untuk proyek baru: Fixed Price dan Per Jam");
    expect(gettingStarted).toContain("Pilih Tipe Billing: Fixed Price atau Hourly (Per Jam).");
  });
});
