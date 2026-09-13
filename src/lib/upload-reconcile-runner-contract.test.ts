import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync("scripts/reconcile-upload-saga.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

describe("upload reconciliation executable", () => {
  it("defaults dry-run and guards production apply", () => {
    expect(script).toContain('process.argv.includes("--apply")');
    expect(script).toContain("ALLOW_PRODUCTION_UPLOAD_RECONCILE");
    expect(script).toContain("R2_CONFIGURED");
  });
  it("loads exact DB references and emits fail-closed JSON evidence", () => {
    expect(script).toContain("uploadIntents");
    expect(script).toContain("scanUploadObjectInventory");
    expect(script).toContain("buildUploadReconcileEvidence");
    expect(script).toContain("process.exitCode = 1");
    expect(pkg).toContain('"reconcile:upload-saga"');
  });
});
