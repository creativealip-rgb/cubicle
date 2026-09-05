import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("detail fixture mobile surfaces", () => {
  it("keeps project header actions and tabs inside mobile viewport", () => {
    const source = read("src/app/(app)/app/projects/[projectId]/page.tsx");
    const nav = read("src/components/projects/project-tabs-nav.tsx");
    expect(source).toContain("FolderKanban");
    expect(source).toContain("ProjectEditDialog");
    expect(source).toContain("PermanentDeleteButton");
    expect(nav).toContain("overflow-x-auto");
  });

  it("keeps Template Center tabs on one scrollable mobile row", () => {
    const source = read("src/components/template-center-client.tsx");
    const tabs = read("src/components/ui/status-filter-tabs.tsx");
    expect(source).toContain("StatusFilterTabs");
    expect(tabs).toContain("inline-flex h-auto w-full items-center justify-start overflow-x-auto");
    expect(source).not.toContain("flex-wrap justify-start");
  });

  it("namespaces reusable QA portal slugs", () => {
    const source = read("scripts/seed-qa-manual.mjs");
    expect(source).toContain('`kopi-senja-qa-${SUFFIX}`');
    expect(source).toContain('`klinik-harmoni-qa-${SUFFIX}`');
  });
});
