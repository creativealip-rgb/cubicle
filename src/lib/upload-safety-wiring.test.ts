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
    const multipartParse = body.indexOf("req.formData()") >= 0 ? body.indexOf("req.formData()") : body.indexOf("limitedRequest.formData()");
    expect(multipartParse).toBeGreaterThan(-1);
    expect(body.indexOf("validateContentLength")).toBeLessThan(multipartParse);
  });

  it("does not expose raw internal upload errors", () => {
    for (const path of uploadRoutes) {
      const body = read(path);
      expect(body).toContain("safeUploadErrorResponse");
      expect(body).not.toContain("{ error: message }");
    }
  });

  it("returns a stable quota-block code instead of a raw quota message", () => {
    // All three upload routes must not ship a hardcoded English quota string;
    // the API-safe mapper sends QUOTA_BLOCKED and clients localize it.
    for (const path of uploadRoutes) {
      const body = read(path);
      expect(body).toContain("safeUploadErrorResponse");
      expect(body).not.toContain('"Storage quota exceeded"');
    }
    const lib = read("src/lib/upload-safety.ts");
    expect(lib).toContain('QUOTA_BLOCK_CODE, status: 413');
    expect(lib).not.toContain('"Storage quota exceeded"');
  });

  it("maps the quota-block code to a bilingual message on every upload surface", () => {
    // The shared client-safe module owns the bilingual strings.
    const messages = read("src/lib/upload-quota-messages.ts");
    expect(messages).toContain('"Kuota penyimpanan workspace sudah penuh');
    expect(messages).toContain('"Workspace storage quota is full');
    // Normal app upload path: both components pass the active language into
    // the shared client helper, which maps the code before surfacing errors.
    const clientLib = read("src/lib/files-upload.ts");
    expect(clientLib).toContain("quotaBlockMessage");
    expect(read("src/components/files/file-drop-zone.tsx")).toContain(
      "uploadOneFile(file, scope, undefined, lang)",
    );
    expect(read("src/components/files/upload-button.tsx")).toContain(
      "await uploadOneFile(",
    );
    // Portal surfaces map the code from their own API responses.
    expect(read("src/components/portal/portal-file-manager.tsx")).toContain(
      "quotaBlockMessage",
    );
    expect(read("src/components/portal/portal-request-list.tsx")).toContain(
      "quotaBlockMessage",
    );
  });

  it("does not leak a raw quota message to the client upload layer", () => {
    const clientLib = read("src/lib/files-upload.ts");
    expect(clientLib).not.toContain('Storage quota exceeded');
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
