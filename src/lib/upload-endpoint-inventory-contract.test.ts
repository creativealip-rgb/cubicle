import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Phase 4 upload endpoint inventory", () => {
  it.each([
    "src/app/api/files/upload/route.ts",
    "src/app/api/client-portal/files/upload/route.ts",
    "src/app/api/client-portal/requests/upload/route.ts",
  ])("routes untrusted file records through upload intent saga: %s", (path) => {
    const source = read(path);
    expect(source).toMatch(/createUploadIntent|promoteBufferedUpload/);
    expect(source).not.toContain("buildFileKey");
    expect(source).not.toContain("withWorkspaceQuotaReservation");
  });

  it.each([
    ["src/app/api/expenses/receipt/route.ts", "10 * 1024 * 1024", "validateExpenseReceipt"],
    ["src/app/api/site/upload/route.ts", "5 * 1024 * 1024", "validateUploadedFile"],
    ["src/app/api/workspace/logo/route.ts", "2 * 1024 * 1024", "detectImageMime"],
  ])("keeps bounded domain uploads authenticated and signature-validated: %s", (path, limit, validator) => {
    const source = read(path);
    expect(source).toContain(limit);
    expect(source).toContain(validator);
    expect(source).toMatch(/getSession|assertWorkspaceOwner/);
  });
});
