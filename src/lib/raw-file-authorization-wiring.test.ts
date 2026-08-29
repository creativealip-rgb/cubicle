import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("raw file authorization", () => {
  it("resolves the file row and reuses protected file access", () => {
    const route = read("src/app/api/files/raw/[...key]/route.ts");
    expect(route).toContain("from(files)");
    expect(route).toContain("storageKey");
    expect(route).toContain("canAccessFile");
    expect(route).toContain('"X-Content-Type-Options": "nosniff"');
    expect(route).not.toContain('"Cache-Control": "public');
  });

  it("builds document media from protected file ids, never storage keys", () => {
    const blocks = read("src/lib/document-blocks.ts");
    expect(blocks).toContain("`/api/files/${file.id}/download`");
    expect(blocks).not.toContain("`/api/files/raw/${file.storageKey}`");
  });
});
