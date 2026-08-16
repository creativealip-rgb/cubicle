import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const actions = read("src/lib/actions/contracts.ts");
const editPage = read("src/app/(app)/app/contracts/[contractId]/edit/page.tsx");
const editor = read("src/components/documents/document-block-editor.tsx");

function bodyOf(source: string, start: string, end: string) {
  return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
}

describe("contract placeholder surface parity", () => {
  it("send snapshot uses shared snake-case placeholder values", () => {
    const send = bodyOf(actions, "export async function sendContract", "export async function createClientFromSignedContract");
    expect(send).toContain("buildContractPlaceholderValues");
    expect(send).toContain("resolveDocumentPlaceholders");
    expect(send).toContain('"contract.number": String(vars.contract_number');
    expect(send).toContain('variables: { ...legacyVars, ...vars }');
  });

  it("editor receives document values and renders a resolved preview", () => {
    expect(editPage).toContain("buildContractPlaceholderValues");
    expect(editPage).toContain("placeholderValues={placeholderValues}");
    expect(editor).toContain("placeholderValues?: DocumentPlaceholderValues");
    expect(editor).toContain("renderDocumentBlockHtml(block, placeholderValues)");
    expect(editor).toContain('t("Pratinjau", "Preview")');
  });
});
