import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const del = readFileSync("src/components/contracts/delete-contract-button.tsx", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");

describe("contract cleanup and public version skew", () => {
  it("uses accessible controlled contract deletion confirmation", () => {
    expect(del).toContain("ConfirmDialog");
    expect(del).toContain("destructive");
    expect(del).not.toContain("if (!confirm(");
  });

  it("installs stale Server Action recovery in root layout", () => {
    expect(layout).toContain("GlobalVersionSkewRecovery");
  });
});
