import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const schema = read("src/db/schema.ts");
const migration = read("drizzle/0075_autosave_revision_guard.sql");
const proposals = read("src/lib/actions/proposals.ts");
const contracts = read("src/lib/actions/contracts.ts");
const editor = read("src/components/documents/document-block-editor.tsx");
const proposalEditPage = read("src/app/(app)/app/proposals/[proposalId]/edit/page.tsx");
const contractEditPage = read("src/app/(app)/app/contracts/[contractId]/edit/page.tsx");

describe("autosave revision/stale-write protection wiring", () => {
  it("adds a content revision column to proposals and contracts in schema and migration", () => {
    expect(schema).toContain('contentRevision: integer("content_revision").notNull().default(1)');
    expect(migration).toContain('ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "content_revision" integer NOT NULL DEFAULT 1;');
    expect(migration).toContain('ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "content_revision" integer NOT NULL DEFAULT 1;');
  });

  it("server save actions accept a revision and compare-and-swap on the stored revision", () => {
    for (const src of [proposals, contracts]) {
      expect(src).toMatch(/revision: z\.number\(\)\.int\(\)\.min\(1\)\.optional\(\)/);
      expect(src).toMatch(/eq\(.*\.contentRevision, expectedRevision\)/);
      expect(src).toMatch(/contentRevision: sql`\$\{.*\.contentRevision\} \+ 1`/);
      // Stale writes are rejected with a distinct, user-facing error
      expect(src).toMatch(/Perubahan sudah kedaluwarsa/);
    }
  });

  it("contract save keeps the mandatory signature block guard", () => {
    expect(contracts).toMatch(/Signature block wajib ada/);
  });

  it("edit pages load the revision and the editor passes it back on every save", () => {
    expect(proposalEditPage).toMatch(/contentRevision: proposals\.contentRevision/);
    expect(proposalEditPage).toMatch(/initialRevision=\{proposal\.contentRevision\}/);
    expect(proposalEditPage).toMatch(/return saveProposalBlocks\(proposalId, \{ contentBlocks: next, revision \}\);/);
    expect(proposalEditPage).toMatch(/saveBlocks=\{saveBlocks\}/);

    expect(contractEditPage).toMatch(/contentRevision: contracts\.contentRevision/);
    expect(contractEditPage).toMatch(/initialRevision=\{contract\.contentRevision\}/);
    expect(contractEditPage).toMatch(/return saveContractBlocks\(contractId, \{ contentBlocks: next, revision \}\);/);
    expect(contractEditPage).toMatch(/saveBlocks=\{saveBlocks\}/);
  });

  it("editor tracks the revision, adopts the server revision after save, and surfaces stale state", () => {
    expect(editor).toMatch(/initialRevision\?: number/);
    expect(editor).toMatch(/saveBlocks: \(blocks: DocumentBlock\[\], revision: number\) => Promise<unknown>/);
    expect(editor).toMatch(/const revision = useRef\(initialRevision\)/);
    expect(editor).toMatch(/revision\.current = result\.contentRevision/);
    expect(editor).toMatch(/Dokumen berubah di tempat lain/);
    expect(editor).toMatch(/disabled=\{!dirty \|\| saving \|\| pending \|\| stale\}/);
  });
});
