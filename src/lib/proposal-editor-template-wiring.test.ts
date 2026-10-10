import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const editor = read("src/components/documents/document-block-editor.tsx");
const proposalEditPage = read("src/app/(app)/app/proposals/[proposalId]/edit/page.tsx");

describe("proposal editor template wiring", () => {
  it("editor wires the starter template flow (button + confirm + buildProposalStarterBlocks)", () => {
    expect(editor).toContain("buildProposalStarterBlocks");
    // b76f7b0a renamed the entry point to the starter-template CTA (+ a picker
    // dialog); applyStarterTemplate replaced handleStartFromTemplate.
    expect(editor).toContain("Gunakan Starter Template");
    expect(editor).toContain("Use Starter Template");
    expect(editor).toMatch(/applyStarterTemplate/);
    expect(editor).toMatch(/showTemplateConfirm/);
    expect(editor).toMatch(/Ganti dengan template\?/);
  });

  it("editor no longer exposes a manual pricing table preset (pricing lives in the form)", () => {
    // bc0e542a removed the insert-preset ACTION. Later copy legitimately REFERS to
    // the document's pricing table, so ban the action, not the words.
    expect(editor).not.toMatch(/addPricingTable/);
    expect(editor).not.toMatch(/handleAddPricingTable/);
  });

  it("editor exposes placeholder chips for every proposal token", () => {
    const tokens = ["{{client_name}}", "{{client_email}}", "{{company_name}}", "{{workspace_name}}", "{{proposal_number}}", "{{valid_until}}", "{{today}}", "{{total_amount}}", "{{down_payment}}", "{{subtotal}}", "{{tax}}"];
    for (const token of tokens) {
      expect(editor).toContain(token);
    }
    expect(editor).toMatch(/insertPlaceholder/);
  });

  it("edit page builds placeholder values and passes them to the editor", () => {
    expect(proposalEditPage).toContain("buildProposalPlaceholderValues");
    expect(proposalEditPage).toContain("placeholderValues={placeholderValues}");
    expect(proposalEditPage).toMatch(/downPaymentAmount/);
    expect(proposalEditPage).toMatch(/downPaymentPercent/);
    expect(proposalEditPage).toMatch(/workspaces\.name/);
    expect(proposalEditPage).toMatch(/billingAddress/);
  });
});
