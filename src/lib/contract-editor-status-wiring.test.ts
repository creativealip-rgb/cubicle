import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contract editor status wiring", () => {
  it("shows real contract status and blocks final-document saves", () => {
    const page = readFileSync("src/app/(app)/app/contracts/[contractId]/edit/page.tsx", "utf8");
    const editor = readFileSync("src/components/documents/document-block-editor.tsx", "utf8");
    expect(page).toContain("status: contract.status");
    expect(editor).toContain('proposalMeta?.status || documentMeta?.status || "draft"');
    expect(editor).toContain('["signed", "declined"].includes(docStatus)');
    expect(editor).toContain("savingMeta || documentLocked");
    expect(editor).toContain("{docStatus}");
    expect(editor).not.toContain('proposalMeta?.status || "Draft"');
  });
});