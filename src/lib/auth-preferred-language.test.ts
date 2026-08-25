import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const auth = readFileSync(join(process.cwd(), "src/lib/auth.ts"), "utf8");

describe("preferredLanguage auth field", () => {
  it("does not accept client input and is optional", () => {
    const block = auth.match(/preferredLanguage:\s*\{[\s\S]*?\n      \},/u)?.[0];

    expect(block).toContain("input: false");
    expect(block).toContain("required: false");
  });
});
