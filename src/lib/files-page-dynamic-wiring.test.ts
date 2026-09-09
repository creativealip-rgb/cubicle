import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("files page runtime freshness", () => {
  it("forces dynamic rendering for DB-backed file mutations", () => {
    const source = readFileSync("src/app/(app)/app/files/page.tsx", "utf8");
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain("files={finalFiles}");
    expect(source).not.toContain("? [] : finalFiles");
  });
});