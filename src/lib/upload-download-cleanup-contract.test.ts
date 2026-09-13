import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const download = readFileSync("src/app/api/files/[fileId]/download/route.ts", "utf8");
const raw = readFileSync("src/app/api/files/raw/[...key]/route.ts", "utf8");
const cleanup = readFileSync("src/lib/upload-cleanup-worker.ts", "utf8");

describe("upload download and cleanup lifecycle", () => {
  it("blocks downloads until file promotion completes", () => {
    expect(download).toContain('file.uploadState !== "completed"');
    expect(raw).toContain('file.uploadState !== "completed"');
  });

  it("deletes only canonical quarantine objects behind terminal cleanup claims", () => {
    expect(cleanup).toContain("DeleteObjectCommand");
    expect(cleanup).toContain('startsWith(`quarantine/${intent.workspaceId}/`)');
    expect(cleanup).toContain('intent.state !== "failed_cleanup"');
    expect(cleanup).toContain("cleanupRetryAt");
    expect(cleanup).toContain("retryCount >= 10");
  });
});
