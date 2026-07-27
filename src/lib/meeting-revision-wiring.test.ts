import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("meeting revision wiring", () => {
  it("uses active as the default project tab and removes All", () => {
    const page = read("src/app/(app)/app/projects/page.tsx");
    expect(page).not.toContain('"all",\n  "active"');
    expect(page).toContain('return "active";');
  });

  it("removes portal overview and defaults to projects", () => {
    const tabs = read("src/components/portal/portal-tabs.tsx");
    expect(tabs).not.toContain('"overview"');
    expect(tabs).toContain('return "projects";');
  });

  it("removes invoice timesheet import UI", () => {
    const form = read("src/components/forms/invoice-form.tsx");
    expect(form).not.toContain("Import timesheet");
    expect(form).not.toContain("selectedTimeIds");
  });

  it("adds article generation and raw JSON output", () => {
    const catalog = read("src/lib/prompts/catalog.ts");
    const result = read("src/components/prompts/prompt-result.tsx");
    expect(catalog).toContain('"article"');
    expect(result).toContain("JSON.stringify(result, null, 2)");
  });

  it("shows generation quota instead of spend", () => {
    const studio = read("src/components/prompts/prompt-studio.tsx");
    expect(studio).toContain("generationLimit");
    expect(studio).not.toContain("usage.totalCost.toFixed");
  });

  it("keeps personal page at ten items and uses compact dropdown filtering", () => {
    const action = read("src/lib/actions/personal-notes.ts");
    const page = read("src/app/(app)/app/personal/page.tsx");
    expect(action).toContain("const NOTES_PAGE_SIZE = 10");
    expect(page).not.toContain("<StatusFilterTabs");
  });

  it("keeps dashboard to reminder, recent activity, and finance content", () => {
    const page = read("src/app/(app)/app/dashboard/page.tsx");
    expect(page).not.toContain('label: t("Klien Aktif", "Active Clients")');
    expect(page).not.toContain('{t("Kerja", "Work")}');
    expect(page).toContain('key: "active-projects"');
    expect(page).toContain('xl:grid-cols-[minmax(0,1fr)_400px]');
  });
});
