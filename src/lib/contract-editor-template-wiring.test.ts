import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const editor = read("src/components/documents/document-block-editor.tsx");

describe("contract editor template wiring", () => {
  it("editor wires the contract starter template", () => {
    expect(editor).toContain("buildContractStarterBlocks");
    expect(editor).toContain('kind === "contract" ? buildContractStarterBlocks() : buildProposalStarterBlocks()');
    expect(editor).toContain("{{contract_number}}");
    expect(editor).toContain("{{contract_date}}");
    expect(editor).toContain("{{workspace_address}}");
  });

  it("start-from-template button is not proposal-gated", () => {
    expect(editor).toContain("Start from template");
    expect(editor).toContain("Mulai dari template");
    // The desktop Insert panel button must render for both kinds:
    expect(editor).toContain('onClick={handleStartFromTemplate}>+ {t("Mulai dari template", "Start from template")}</Button>');
    // ...and must not be wrapped in a proposal-only gate (either desktop panel or mobile drawer):
    expect(editor).not.toContain('kind === "proposal" && <Button type="button" variant="outline" className="justify-start" onClick={handleStartFromTemplate}');
  });

  it("placeholder chips are branched by kind", () => {
    expect(editor).toContain("proposalTokens");
    expect(editor).toContain("contractTokens");
    expect(editor).toContain("kind === \"contract\" ? contractTokens : proposalTokens");
  });
});
