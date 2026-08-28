import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const contractActions = read("src/lib/actions/contract-templates.ts");
const proposalActions = read("src/lib/actions/proposal-templates.ts");
const editor = read("src/components/documents/document-block-editor.tsx");
const blocksEditor = read("src/components/templates/template-blocks-editor.tsx");
const center = read("src/components/template-center-client.tsx");
const contractDetail = read("src/app/(app)/app/contract-templates/[templateId]/page.tsx");
const contractEdit = read("src/app/(app)/app/templates/[templateId]/edit/page.tsx");
const proposalEdit = read("src/app/(app)/app/templates/[templateId]/edit/proposal/page.tsx");

describe("unified template block editor wiring (batch 2)", () => {
  it("template create/update actions already accept and normalize contentBlocks", () => {
    expect(contractActions).toMatch(/contentBlocks: z\.unknown\(\)\.optional\(\)/);
    expect(contractActions).toMatch(/normalizeDocumentBlocks\(parsed\.contentBlocks, "contract"\)/);
    expect(proposalActions).toMatch(/contentBlocks: z\.unknown\(\)\.optional\(\)/);
    expect(proposalActions).toMatch(/normalizeDocumentBlocks\(parsed\.contentBlocks, "proposal"\)/);
  });

  it("template-blocks actions are workspace-scoped, validate blocks, no CAS", () => {
    const actions = read("src/lib/actions/template-blocks.ts");
    expect(actions).toMatch(/export async function saveContractTemplateBlocks/);
    expect(actions).toMatch(/export async function saveProposalTemplateBlocks/);
    // Workspace scoping on both read and write
    expect(actions).toMatch(/eq\(contractTemplates\.workspaceId, workspaceId\)/);
    expect(actions).toMatch(/eq\(proposalTemplates\.workspaceId, workspaceId\)/);
    // Server-side normalization of untrusted client blocks
    expect(actions).toMatch(/normalizeDocumentBlocks\(parsed\.contentBlocks, "contract"\)/);
    expect(actions).toMatch(/normalizeDocumentBlocks\(parsed\.contentBlocks, "proposal"\)/);
    // No CAS (no revision column on templates) — plain update
    expect(actions).not.toMatch(/contentRevision/);
    // Proposal templates reject non-workspace image srcs like live proposals
    expect(actions).toMatch(/isSameOriginMediaSrc/);
    expect(actions).toMatch(/Gambar hanya bisa dari file workspace/);
  });

  it("edit routes render the block editor with workspace-scoped template lookup", () => {
    for (const page of [contractDetail, contractEdit, proposalEdit]) {
      expect(page).toMatch(/TemplateBlocksEditor/);
      expect(page).toMatch(/eq\(.*\.workspaceId, workspaceId\)/);
    }
    expect(contractDetail).toMatch(/contentBlocks: contractTemplates\.contentBlocks/);
    expect(contractEdit).toMatch(/contentBlocks: contractTemplates\.contentBlocks/);
    expect(proposalEdit).toMatch(/contentBlocks: proposalTemplates\.contentBlocks/);
  });

  it("shared editor renders DocumentBlockEditor and wires save actions", () => {
    expect(blocksEditor).toMatch(/DocumentBlockEditor/);
    expect(blocksEditor).toMatch(/normalizeDocumentBlocks\(template\.contentBlocks, kind\)/);
    expect(blocksEditor).toMatch(/defaultDocumentBlocks\(kind\)/);
    expect(blocksEditor).toMatch(/saveContractTemplateBlocks\(template\.id, \{ contentBlocks: next \}\)/);
    expect(blocksEditor).toMatch(/saveProposalTemplateBlocks\(template\.id, \{ contentBlocks: next \}\)/);
  });

  it("Template Center Edit opens the block editor for proposal and contract", () => {
    expect(center).toMatch(/router\.push\(`\/app\/templates\/\$\{tpl\.id\}\/edit`\)/);
    expect(center).toMatch(/router\.push\(`\/app\/templates\/\$\{tpl\.id\}\/edit\/proposal`\)/);
    expect(center).toMatch(/type === "contract"/);
  });
});
