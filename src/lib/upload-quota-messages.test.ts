import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  QUOTA_BLOCK_CODE,
  quotaBlockMessage,
} from "@/lib/upload-quota-messages";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("bilingual quota-block error mapping", () => {
  it("maps the quota-block code to ID/EN messages and returns null otherwise", () => {
    expect(quotaBlockMessage(QUOTA_BLOCK_CODE, "id")).toBe(
      "Kuota penyimpanan workspace sudah penuh. Hapus beberapa file atau tingkatkan paket Anda untuk melanjutkan.",
    );
    expect(quotaBlockMessage(QUOTA_BLOCK_CODE, "en")).toBe(
      "Workspace storage quota is full. Delete some files or upgrade your plan to continue.",
    );
    // Non-quota errors are NOT rewritten — raw fallback stays intact.
    expect(quotaBlockMessage("Upload failed", "id")).toBeNull();
    expect(quotaBlockMessage(undefined, "en")).toBeNull();
  });

  it("ships the stable quota-block code from the API-safe response mapper", () => {
    const lib = read("src/lib/upload-safety.ts");
    expect(lib).toContain(`QUOTA_BLOCK_CODE, status: 413`);
  });

  it("localizes the quota block on all four upload surfaces", () => {
    // Normal app upload path (upload button + drag-and-drop zone) shares the
    // same client helper, which must map the code before surfacing an error.
    const clientLib = read("src/lib/files-upload.ts");
    expect(clientLib).toContain('quotaBlockMessage(msg, lang) ?? msg');
    // Portal surfaces read the code from their API responses.
    expect(read("src/components/portal/portal-file-manager.tsx")).toContain(
      'quotaBlockMessage(error, lang) ?? error',
    );
    expect(read("src/components/portal/portal-request-list.tsx")).toContain(
      'quotaBlockMessage(error, lang) ?? error',
    );
  });

  it("keeps a raw fallback for non-quota upload errors", () => {
    const clientLib = read("src/lib/files-upload.ts");
    // Raw server messages still flow through unchanged (only the quota code
    // is rewritten), so a generic failure never shows the quota copy.
    expect(clientLib).toContain('reject(new Error(quotaBlockMessage(msg, lang) ?? msg));');
  });
});
