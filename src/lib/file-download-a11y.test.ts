import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/files/file-list.tsx", "utf8");

describe("file download accessibility", () => {
  it("names grid action menus and the icon-only list download action", () => {
    expect(source).toContain('aria-label={t(`Aksi ${file.name}`, `${file.name} actions`)}');
    expect(source).toContain('aria-label={t(`Buka / Unduh ${item.file.name}`, `Open / Download ${item.file.name}`)}');
  });
});
