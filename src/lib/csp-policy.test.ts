import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const nextConfigSource = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");

describe("production Content Security Policy", () => {
  it("blocks plugin content and constrains base URLs and form targets", () => {
    expect(nextConfigSource).toContain('"object-src \'none\'"');
    expect(nextConfigSource).toContain('"base-uri \'self\'"');
    expect(nextConfigSource).toContain('"form-action \'self\'"');
  });

  it("does not allow runtime string evaluation", () => {
    expect(nextConfigSource).not.toContain("'unsafe-eval'");
  });
});
