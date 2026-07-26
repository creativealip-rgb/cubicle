import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const securityHeadersSource = readFileSync(resolve(process.cwd(), "src/lib/security-headers.ts"), "utf8");

describe("production Content Security Policy", () => {
  it("blocks plugin content and constrains base URLs and form targets", () => {
    expect(securityHeadersSource).toContain('"object-src \'none\'"');
    expect(securityHeadersSource).toContain('"base-uri \'self\'"');
    expect(securityHeadersSource).toContain('"form-action \'self\'"');
  });

  it("does not allow runtime string evaluation", () => {
    expect(securityHeadersSource).toContain('isDevelopment ? " \'unsafe-eval\'" : ""');
  });
});
