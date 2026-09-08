import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(app)/app/personal/page.tsx", "utf8");

describe("notes card consistency", () => {
  it("uses canonical workspace card shell", () => {
    expect(page).toContain('<Card className="rounded-xl border border-border/80 bg-card shadow-xs">');
    expect(page).not.toContain('<Card className="rounded-3xl border bg-card shadow-sm">');
  });
});
