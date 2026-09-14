import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("file deletion upload ledger", () => {
  it("deletes completed upload intents before deleting their final file", () => {
    const source = readFileSync("src/lib/actions/files.ts", "utf8");
    const intentDelete = source.indexOf("tx.delete(uploadIntents)");
    const fileDelete = source.indexOf("tx.delete(files)");
    expect(intentDelete).toBeGreaterThan(-1);
    expect(fileDelete).toBeGreaterThan(intentDelete);
    expect(source).toContain("eq(uploadIntents.finalFileId, fileId)");
    expect(source).toContain("eq(uploadIntents.workspaceId, workspaceId)");
  });
});