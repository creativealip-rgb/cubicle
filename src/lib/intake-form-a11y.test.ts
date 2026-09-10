import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/questionnaires/intake-form.tsx", "utf8");

describe("public intake accessibility", () => {
  it("associates labels with generated controls", () => {
    expect(source).toContain('htmlFor={`field-${f.id}`}');
    expect(source.match(/id={`field-\${f.id}`}/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it("announces pending and error states", () => {
    expect(source).toContain("aria-busy={pending}");
    expect(source).toContain('role="alert"');
  });
});
