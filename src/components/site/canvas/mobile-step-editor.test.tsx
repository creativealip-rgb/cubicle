import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(__dirname + "/mobile-step-editor.tsx", "utf8");

describe("MobileStepEditor slug plan gating", () => {
  it("disables custom slug editing for free plans and links upgrade", () => {
    expect(source).toContain('disabled={!canEditSlug}');
    expect(source).toContain('readOnly={!canEditSlug}');
    expect(source).toContain("Paket Free menggunakan slug workspace. Upgrade untuk memakai slug kustom.");
    expect(source).toContain("Free uses your workspace slug. Upgrade to use a custom slug.");
    expect(source).toContain('href="/app/billing"');
    expect(source).toContain('>Upgrade</Link>');
  });
});