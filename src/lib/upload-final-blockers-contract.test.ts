import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("upload final blocker regressions", () => {
  it("releases workspace counters with cleanup reservation CAS", () => {
    const source = read("src/lib/upload-cleanup-worker.ts");
    expect(source).toContain(".returning()");
    expect(source).toContain("consumeWorkspaceUploadTx(tx, claimed.workspaceId, released.bytes)");
  });

  it("copies exact validated source version", () => {
    const source = read("src/lib/upload-object-promotion.ts");
    expect(source).toContain("versionId=${encodeURIComponent(versionId)}");
    expect(source).toContain("copySource(input.bucket, input.quarantineKey, head.VersionId)");
  });

  it("streams raw object responses", () => {
    const source = read("src/app/api/files/raw/[...key]/route.ts");
    expect(source).toContain("object.Body.transformToWebStream()");
    expect(source).not.toContain("transformToByteArray()");
  });

  it.each([
    "src/app/api/client-portal/files/upload/route.ts",
    "src/app/api/client-portal/requests/upload/route.ts",
  ])("portal upload body is hard-capped before multipart parsing in %s", (path) => {
    const source = read(path);
    expect(source.indexOf("readRequestBodyWithinLimit")).toBeLessThan(source.indexOf(".formData()"));
    expect(source).toContain("enforceRateLimitResponse");
  });
});
