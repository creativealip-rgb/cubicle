import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (p: string) => readFileSync(p, "utf8");

/** Every builder that owns a window-level keydown handler. */
const BUILDERS: Array<[string, string]> = [
  ["landing", "src/components/site/canvas/canvas-editor.tsx"],
  ["forms", "src/components/questionnaires/questionnaire-builder.tsx"],
  ["documents", "src/components/documents/document-block-editor.tsx"],
];

describe("builder keyboard shortcuts route through the shared resolver", () => {
  it.each(BUILDERS)("%s imports resolveBuilderShortcut", (_name, path) => {
    expect(read(path)).toContain('import { resolveBuilderShortcut } from "@/lib/builder-shortcuts"');
  });

  it.each(BUILDERS)("%s keeps exactly one window keydown listener", (_name, path) => {
    expect(read(path).match(/window\.addEventListener\("keydown"/g)).toHaveLength(1);
  });

  /**
   * The defect this locks. Each builder used to carry its own copy that called
   * `preventDefault()` on Ctrl+Z unconditionally, so with a text field focused
   * the document reverted underneath the caret and the field lost its native
   * undo. The copies also compared `e.key` against lowercase only, so an
   * uppercase key ("Z" under CapsLock) silently missed and undo did nothing.
   * Neither shape may come back — the resolver owns both rules now.
   */
  it.each(BUILDERS)("%s does not restore an unguarded local copy", (_name, path) => {
    const source = read(path);
    expect(source).not.toContain('e.key === "z"');
    expect(source).not.toContain('e.key === "Z"');
    expect(source).not.toContain('e.key === "y"');
  });
});
