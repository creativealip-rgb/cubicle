import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const uploadRoutes = [
  "src/app/api/files/upload/route.ts",
  "src/app/api/client-portal/files/upload/route.ts",
  "src/app/api/client-portal/requests/upload/route.ts",
];

describe("upload safety wiring", () => {
  it.each(uploadRoutes)("checks quota before R2 and compensates DB failure in %s", (path) => {
    const body = read(path);
    expect(body).toContain("assertUploadQuota");
    expect(body.indexOf("assertUploadQuota")).toBeLessThan(body.indexOf("new PutObjectCommand"));
    expect(body).toContain("deleteStoredFile");
    expect(body).toContain("uploadedObject");
  });

  it.each([
    ...uploadRoutes,
    "src/app/api/expenses/receipt/route.ts",
    "src/app/api/workspace/logo/route.ts",
  ])("rejects oversized request before multipart parsing in %s", (path) => {
    const body = read(path);
    expect(body).toContain("validateContentLength");
    expect(body.indexOf("validateContentLength")).toBeLessThan(body.indexOf("req.formData()"));
  });

  it("does not expose raw internal upload errors", () => {
    for (const path of uploadRoutes) {
      const body = read(path);
      expect(body).toContain("safeUploadErrorResponse");
      expect(body).not.toContain("{ error: message }");
    }
  });

  it("disables legacy presigned upload issuance", () => {
    expect(read("src/lib/actions/files.ts")).not.toContain("getR2UploadUrl(");
    expect(read("src/lib/actions/expenses.ts")).not.toContain("getR2UploadUrl(");
  });

  it("validates contract signature before token/database work", () => {
    const body = read("src/lib/actions/contracts.ts");
    expect(body).toContain("validateSignatureDataUrl");
    expect(body.indexOf("validateSignatureDataUrl")).toBeLessThan(body.indexOf("hashToken(input.token)"));
  });
});
