import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/files/file-list.tsx", "utf8");

describe("file download accessibility", () => {
  it("names grid action menus and the icon-only list download action", () => {
    // Row + grid kebabs expose a per-item accessible name; row download uses a
    // labelled menu item rather than a bare icon-only control.
    expect(source).toContain('aria-label={t(`Aksi ${file.name}`, `${file.name} actions`)}');
    expect(source).toContain('aria-label={t(`Aksi folder ${f.name}`, `${f.name} folder actions`)}');
    expect(source).toContain('t("Unduh", "Download")');
  });
});
