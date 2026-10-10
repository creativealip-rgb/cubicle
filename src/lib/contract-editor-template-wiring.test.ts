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

  it("starter template is reachable for contracts too, never proposal-gated", () => {
    // b76f7b0a renamed the entry point to the starter CTA + picker dialog, so the
    // old handleStartFromTemplate / confirm-label anchors are obsolete. The
    // INVARIANT (both kinds can start from a template) still holds: build the
    // template per kind, and never behind a proposal-only gate.
    expect(editor).toContain('t("Gunakan Starter Template", "Use Starter Template")');
    expect(editor).toContain("applyStarterTemplate");
    expect(editor).toContain('kind === "contract" ? buildContractStarterBlocks() : buildProposalStarterBlocks()');
    expect(editor).not.toMatch(/kind === "proposal" && <Button[^>]*applyStarterTemplate/);
  });

  it("placeholder chips are branched by kind", () => {
    expect(editor).toContain("proposalTokens");
    expect(editor).toContain("contractTokens");
    expect(editor).toContain("kind === \"contract\" ? contractTokens : proposalTokens");
  });
});
