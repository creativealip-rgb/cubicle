import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const contractActions = read("src/lib/actions/contracts.ts");
const proposalActions = read("src/lib/actions/proposals.ts");
const createContractButton = read("src/components/contracts/create-contract-button.tsx");
const proposalForm = read("src/components/proposals/proposal-form.tsx");
const contractsPage = read("src/app/(app)/app/contracts/page.tsx");
const proposalsNewPage = read("src/app/(app)/app/proposals/new/page.tsx");
const listContractTemplates = read("src/lib/actions/contract-templates.ts");
const listProposalTemplates = read("src/lib/actions/proposal-templates.ts");

describe("unified template contentBlocks in real create flows (batch 3)", () => {
  it("createContract accepts contentBlocks and re-fetches the workspace-scoped template server-side", () => {
    expect(contractActions).toMatch(/contentBlocks: z\.unknown\(\)\.optional\(\)/);
    // Server-side re-fetch: the picker's client payload is NOT trusted for content.
    expect(contractActions).toMatch(/Re-fetch the template server-side/);
    expect(contractActions).toMatch(/eq\(contractTemplates\.id, parsed\.templateId\)/);
    expect(contractActions).toMatch(/eq\(contractTemplates\.workspaceId, parsed\.workspaceId\)/);
    expect(contractActions).toMatch(/normalizeDocumentBlocks\(template\.contentBlocks, "contract"\)/);
    // Template blocks win; legacy body fallback keeps the template body.
    expect(contractActions).toMatch(/const contentBlocks = templateBlocks\.length > 0/);
    expect(contractActions).toMatch(/templateBody \|\| parsed\.body/);
    expect(contractActions).toMatch(/templateId: parsed\.templateId \|\| null/);
    expect(contractActions).toMatch(/contentBlocks,\n      bodyResolved: null/);
  });

  it("createProposal accepts templateId + contentBlocks and re-fetches the workspace-scoped template server-side", () => {
    expect(proposalActions).toMatch(/templateId: z\.string\(\)\.uuid\(\)\.optional\(\)\.nullable\(\)/);
    expect(proposalActions).toMatch(/contentBlocks: z\.unknown\(\)\.optional\(\)/);
    expect(proposalActions).toMatch(/Re-fetch the template server-side/);
    expect(proposalActions).toMatch(/eq\(proposalTemplates\.id, parsed\.templateId\)/);
    expect(proposalActions).toMatch(/eq\(proposalTemplates\.workspaceId, parsed\.workspaceId\)/);
    expect(proposalActions).toMatch(/normalizeDocumentBlocks\(template\.contentBlocks, "proposal"\)/);
    expect(proposalActions).toMatch(/const contentBlocks = templateBlocks\.length > 0/);
    expect(proposalActions).toMatch(/templateBody \|\| parsed\.body/);
    // Billing metadata stays with the form: applyTemplate prefills it and the
    // user can still edit before submit — the action keeps parsed values.
    expect(proposalActions).toMatch(/currency: parsed\.currency/);
    expect(proposalActions).toMatch(/tax: tax\.toFixed\(2\)/);
    expect(proposalActions).toMatch(/downPaymentPercent: parsed\.downPaymentPercent/);
    expect(proposalActions).toMatch(/contentBlocks,\n      lineItems,/);
  });

  it("CreateContractButton passes templateId and renders the template picker", () => {
    expect(createContractButton).toMatch(/contentBlocks\?: unknown/);
    expect(createContractButton).toMatch(/selectedTemplateId/);
    expect(createContractButton).toMatch(/templateId: selectedTemplateId/);
    expect(createContractButton).toMatch(/templates\.length > 0/);
    // Do not send client-side blocks for contracts — the server re-fetches.
    expect(createContractButton).not.toMatch(/contentBlocks: template/);
  });

  it("ProposalForm passes templateId and keeps metadata application on template select", () => {
    expect(proposalForm).toMatch(/contentBlocks\?: unknown/);
    expect(proposalForm).toMatch(/selectedTemplateId/);
    expect(proposalForm).toMatch(/templateId: selectedTemplateId/);
    expect(proposalForm).toMatch(/setSelectedTemplateId\(id\)/);
    // applyTemplate still prefills currency/tax/DP/lineItems from the template.
    expect(proposalForm).toMatch(/template\.defaultCurrency \|\| prev\.currency/);
    expect(proposalForm).toMatch(/Number\(template\.defaultTaxRate\) \|\| 0/);
    expect(proposalForm).toMatch(/Number\(template\.defaultDownPaymentPercent\) \|\| 0/);
    expect(proposalForm).toMatch(/JSON\.parse\(template\.lineItems\)/);
  });

  it("template list actions expose contentBlocks to the create flows", () => {
    // Contract list returns full rows (db.select()) so contentBlocks is included;
    // proposal list explicitly selects contentBlocks.
    expect(listContractTemplates).toMatch(/\.from\(contractTemplates\)/);
    expect(listProposalTemplates).toMatch(/contentBlocks: proposalTemplates\.contentBlocks/);
  });

  it("create pages keep passing workspace-scoped templates into the flows", () => {
    expect(contractsPage).toMatch(/listContractTemplates\(\)/);
    expect(contractsPage).toMatch(/templates=\{contractTemplates\}/);
    expect(proposalsNewPage).toMatch(/listProposalTemplates\(\)/);
    expect(proposalsNewPage).toMatch(/templates=\{proposalTemplates\}/);
  });
});
