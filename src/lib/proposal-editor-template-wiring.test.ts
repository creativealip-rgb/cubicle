import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const editor = read("src/components/documents/document-block-editor.tsx");
const proposalEditPage = read("src/app/(app)/app/proposals/[proposalId]/edit/page.tsx");

describe("proposal editor template wiring", () => {
  it("editor wires the starter template flow (button + confirm + buildProposalStarterBlocks)", () => {
    expect(editor).toContain("buildProposalStarterBlocks");
    expect(editor).toContain("Mulai dari template");
    expect(editor).toContain("Start from template");
    expect(editor).toMatch(/handleStartFromTemplate/);
    expect(editor).toMatch(/showTemplateConfirm/);
    expect(editor).toMatch(/Ganti dengan template\?/);
  });

  it("editor exposes the pricing table preset", () => {
    expect(editor).toContain("Pricing Table");
    expect(editor).toMatch(/addPricingTable/);
    expect(editor).toMatch(/\[\"Item\", \"Qty\", \"Harga\", \"Jumlah\"\]/);
    expect(editor).toMatch(/\[\"\", \"\", \"\", \"\"\]/);
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
