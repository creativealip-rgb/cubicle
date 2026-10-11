import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/files/file-list.tsx", "utf8");

describe("compact Drive-style files grid", () => {
  it("uses compact cards and semantically named action menus", () => {
    expect(source).toContain("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6");
    expect(source).toContain("<MoreVertical");
    // Every icon-only kebab menu carries an accessible name scoped to its item.
    expect(source).toContain("`${f.name} folder actions`");
    expect(source).toContain("`${file.name} actions`");
    expect(source).not.toContain("min-h-32 flex-col justify-between");
  });
});
