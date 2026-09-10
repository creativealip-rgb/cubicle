import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const clients = readFileSync("src/app/(app)/app/clients/page.tsx", "utf8");
const files = readFileSync("src/app/(app)/app/files/page.tsx", "utf8");

describe("client and files pagination", () => {
  it("limits client rows to ten and renders pagination", () => {
    expect(clients).toContain("const PAGE_SIZE = 10");
    expect(clients).toContain("filtered.slice");
    expect(clients).toContain("PaginationLinks");
  });

  it("paginates folder and file sections independently by ten", () => {
    expect(files).toContain("const PAGE_SIZE = 10");
    expect(files).toContain("folderPage");
    expect(files).toContain("filePage");
    expect(files).toContain("paginatedFolders");
    expect(files).toContain("paginatedFiles");
  });
});
