import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/actions/visual-prompts.ts", "utf8");

describe("visual prompt provider hardening", () => {
  it("chooses model server-side and times out provider calls", () => {
    expect(source).toContain("const SERVER_MODEL");
    expect(source).toContain("model: SERVER_MODEL");
    expect(source).toContain("AbortSignal.timeout(60_000)");
    expect(source).not.toContain("model: input.model");
  });

  it("uses explicit pricing for active server model", () => {
    expect(source).toContain('"ag/gemini-3.7-flash"');
    expect(source).toContain("estimateCost(SERVER_MODEL");
  });

  it("does not persist malformed or incomplete provider output as success", () => {
    expect(source).toContain("if (!normalized.structured)");
    expect(source).toContain("AI belum menghasilkan materi lengkap");
  });
});
