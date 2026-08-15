import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("document editor layout wiring", () => {
  it("keeps proposal and contract editor pages full-bleed without forcing sidebar collapse", () => {
    const shell = read("src/components/app-shell.tsx");

    expect(shell).toContain('pathname.startsWith("/app/proposals/")');
    expect(shell).toContain('pathname.startsWith("/app/contracts/")');
    expect(shell).toContain('(focusEditor || documentEditor) && "md:p-0 md:pb-0"');
    expect(shell).toContain('collapsed={focusEditor || collapsed}');
  });

  it("confines document editor scroll to panels and adds detail back links", () => {
    const editor = read("src/components/documents/document-block-editor.tsx");
    const proposalEdit = read("src/app/(app)/app/proposals/[proposalId]/edit/page.tsx");
    const contractEdit = read("src/app/(app)/app/contracts/[contractId]/edit/page.tsx");

    expect(editor).toContain('flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden');
    expect(editor).toContain('flex min-h-0 flex-1');
    expect(editor).toContain('hidden w-56 shrink-0 overflow-y-auto');
    expect(editor).toContain('hidden w-72 shrink-0 overflow-y-auto');
    expect(editor).toContain('backHref?: string');
    expect(editor).toContain('href={backHref}');
    expect(proposalEdit).toContain('backHref={`/app/proposals/${proposalId}`}');
    expect(contractEdit).toContain('backHref={`/app/contracts/${contractId}`}');
  });

  it("uses circular sidebar chevrons for collapse and expand", () => {
    const sidebar = read("src/components/app-sidebar.tsx");

    expect(sidebar).toContain("ChevronLeft");
    expect(sidebar).toContain("ChevronRight");
    expect(sidebar).toContain("absolute -right-3 top-1.5 hidden h-11 w-11 rounded-full");
    expect(sidebar.match(/h-11 w-11/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
