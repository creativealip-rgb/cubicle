import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("viewport-contained builder shell", () => {
  it("locks editor routes to the app viewport", () => {
    const shell = read("src/components/app-shell.tsx");
    expect(shell).toContain('focusEditor && "h-screen overflow-hidden"');
    expect(shell).toContain('"flex min-h-0 min-w-0 flex-1 flex-col');
    expect(shell).toContain('"min-h-0 min-w-0 flex-1');
  });

  it.each([
    "src/components/documents/document-block-editor.tsx",
    "src/components/questionnaires/questionnaire-builder.tsx",
  ])("inherits available height instead of recalculating viewport: %s", (path) => {
    const source = read(path);
    expect(source).toContain('className="flex h-full min-h-0');
    expect(source).not.toContain('h-[calc(100vh-3.5rem)]');
    expect(source).not.toContain('h-[calc(100vh-56px)]');
  });

  it("keeps workflow header and rails outside canvas scrolling", () => {
    const shell = read("src/components/builder/builder-shell.tsx");
    expect(shell).toContain('"flex h-full min-h-0 flex-col"');
    expect(shell).toContain('"flex min-h-0 flex-1 overflow-hidden"');
    expect(shell).toContain('"min-h-0 shrink-0 overflow-y-auto');
    expect(shell).toContain('"min-w-0 min-h-0 flex-1 overflow-y-auto');
  });
});
