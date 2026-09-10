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

  it("paginates one folder-first files collection by ten", () => {
    const list = readFileSync("src/components/files/file-list.tsx", "utf8");
    expect(files).not.toContain("folderPage");
    expect(files).not.toContain("filePage");
    expect(list).toContain("combinedItems");
    expect(list).toContain("paginatedItems");
    expect(list).toContain("const PAGE_SIZE = 10");
  });
});
