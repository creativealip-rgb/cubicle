import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/files/file-list.tsx", "utf8");

describe("file download accessibility", () => {
  it("names the icon-only grid download action", () => {
    expect(source).toContain('aria-label={t(`Buka / Unduh ${file.name}`, `Open / Download ${file.name}`)}');
  });
});
