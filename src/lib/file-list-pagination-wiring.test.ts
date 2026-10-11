import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("files page layout and list wiring", () => {
  it("keeps the folder sidebar in its own scrollable column", () => {
    const layout = readFileSync(
      resolve(__dirname, "../app/(app)/app/files/layout.tsx"),
      "utf8",
    );
    // Drive-style layout: no page-level sticky, the sidebar column scrolls independently.
    expect(layout).toContain("lg:col-span-1 h-full flex flex-col overflow-hidden");
    expect(layout).toContain("overflow-y-auto");
  });

  it("paginates the file list with prev/next navigation", () => {
    const fileList = readFileSync(
      resolve(__dirname, "../components/files/file-list.tsx"),
      "utf8",
    );
    expect(fileList).toContain("const PAGE_SIZE = 30");
    expect(fileList).toContain("paginatedFiles.map");
    expect(fileList).toContain("totalPages");
  });
});
