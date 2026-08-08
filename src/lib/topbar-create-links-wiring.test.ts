import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("topbar create quick links", () => {
  const topbar = read("src/components/app-topbar.tsx");

  it("does not link to non-existent /app/projects/new and /app/tasks/new routes", () => {
    expect(topbar).not.toContain('href="/app/projects/new"');
    expect(topbar).not.toContain('href="/app/tasks/new"');
  });

  it("keeps quick links to routes that exist", () => {
    for (const href of [
      "/app/clients/new",
      "/app/proposals/new",
      "/app/questionnaires/new",
      "/app/invoices/new",
    ]) {
      expect(topbar).toContain(`href="${href}"`);
    }
  });

  it("preserves project and task creation UX via list-page dialogs", () => {
    expect(read("src/app/(app)/app/projects/page.tsx")).toContain("ProjectCreateDialog");
    expect(read("src/app/(app)/app/tasks/page.tsx")).toContain("TaskCreateDialog");
  });
});
