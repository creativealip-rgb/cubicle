import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("document editor layout wiring", () => {
  it("keeps proposal and contract editor pages full-bleed without forcing sidebar collapse", () => {
    const shell = read("src/components/app-shell.tsx");

    expect(shell).toContain('pathname.startsWith("/app/proposals/")');
    expect(shell).toContain('pathname.startsWith("/app/contracts/")');
    expect(shell).toContain('(focusEditor || documentEditor || onBrainPage)');
    expect(shell).toContain('collapsed={focusEditor || collapsed}');
  });

  it("confines document editor scroll to panels and adds detail back links", () => {
    const editor = read("src/components/documents/document-block-editor.tsx");
    const proposalEdit = read("src/app/(app)/app/proposals/[proposalId]/edit/page.tsx");
    const contractEdit = read("src/app/(app)/app/contracts/[contractId]/edit/page.tsx");

    expect(editor).toContain('flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden');
    // Panels are now responsive asides (w-64 sm:w-72) that clip internally and
    // scroll their own body; the outer shell still confines the page scroll.
    expect(editor).toMatch(/aside className="w-64 sm:w-72 border-r[^"]*shrink-0 h-full overflow-hidden/);
    expect(editor).toMatch(/aside className="w-64 sm:w-72 border-l[^"]*shrink-0 h-full overflow-hidden/);
    expect(editor).toContain("flex-1 overflow-y-auto");
    expect(editor).toContain('backHref?: string');
    expect(editor).toContain('href={backHref}');
    // b76f7b0a points the back link at the list route, not the detail route.
    expect(proposalEdit).toContain('backHref="/app/proposals"');
    expect(contractEdit).toContain('backHref="/app/contracts"');
  });

  it("uses compact circular sidebar chevrons for collapse and expand", () => {
    const sidebar = read("src/components/app-sidebar.tsx");

    expect(sidebar).toContain("ChevronLeft");
    expect(sidebar).toContain("ChevronRight");
    expect(sidebar).toContain("absolute -right-3 top-4 hidden h-6 w-6 rounded-full");
    expect(sidebar.match(/h-6 w-6 rounded-full/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
