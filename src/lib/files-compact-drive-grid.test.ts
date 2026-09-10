import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/files/file-list.tsx", "utf8");

describe("compact Drive-style files grid", () => {
  it("uses compact horizontal cards and semantic action menus", () => {
    expect(source).toContain('className="group flex h-14 items-center gap-3 rounded-xl bg-muted/60 px-3');
    expect(source).toContain("<MoreVertical");
    expect(source).toContain('`${folder.name} actions`');
    expect(source).toContain('`${file.name} actions`');
    expect(source).not.toContain("min-h-32 flex-col justify-between");
  });
});
