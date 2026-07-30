import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("detail fixture mobile surfaces", () => {
  it("keeps project header actions and tabs inside mobile viewport", () => {
    const source = read("src/app/(app)/app/projects/[projectId]/page.tsx");
    expect(source).toContain('className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"');
    expect(source).toContain('className="min-w-0 space-y-2"');
    expect(source).toContain('className="flex min-w-0 items-center gap-3"');
    expect(source).toContain('className="min-w-0 truncate app-page-title"');
    expect(source).toContain('className="max-w-full justify-start overflow-x-auto"');
  });

  it("keeps Template Center tabs on one scrollable mobile row", () => {
    const source = read("src/components/template-center-client.tsx");
    expect(source).toContain('className="inline-flex h-auto max-w-full justify-start gap-1 overflow-x-auto"');
    expect(source).not.toContain("flex-wrap justify-start");
  });

  it("namespaces reusable QA portal slugs", () => {
    const source = read("scripts/seed-qa-manual.mjs");
    expect(source).toContain('`kopi-senja-qa-${SUFFIX}`');
    expect(source).toContain('`klinik-harmoni-qa-${SUFFIX}`');
  });
});
