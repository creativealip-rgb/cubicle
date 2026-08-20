import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("files page layout and list wiring", () => {
  it("keeps sidebar sticky under topbar with lg:top-20", () => {
    const layout = readFileSync(
      resolve(__dirname, "../app/(app)/app/files/layout.tsx"),
      "utf8",
    );
    expect(layout).toContain("lg:sticky lg:top-20");
  });

  it("paginates file list to 10 items per page with prev/next navigation", () => {
    const fileList = readFileSync(
      resolve(__dirname, "../components/files/file-list.tsx"),
      "utf8",
    );
    expect(fileList).toContain("const PAGE_SIZE = 10;");
    expect(fileList).toContain("paginated.map");
    expect(fileList).toContain("totalPages > 1");
  });
});
