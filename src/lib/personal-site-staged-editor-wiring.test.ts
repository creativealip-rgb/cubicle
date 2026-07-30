import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/components/site/builder-client.tsx"), "utf8");

describe("personal site staged editor", () => {
  it("offers four clear editor sections", () => {
    expect(source).toContain('type EditorSection = "identity" | "content" | "links" | "appearance"');
    expect(source).toContain('const [editorSection, setEditorSection] = useState<EditorSection>("identity")');
    for (const label of ["Identitas", "Konten", "Tautan", "Tampilan"]) expect(source).toContain(label);
  });

  it("renders only the selected editor section", () => {
    expect(source).toContain('editorSection !== "identity" ? "hidden" : undefined');
    expect(source).toContain('editorSection !== "content" ? "hidden" : undefined');
    expect(source).toContain('editorSection !== "links" ? "hidden" : undefined');
    expect(source).toContain('editorSection !== "appearance" ? "hidden" : undefined');
  });

  it("uses open-in-new-tab preview copy", () => {
    expect(source).toContain('t("Buka preview di tab baru", "Open preview in new tab")');
    expect(source).not.toContain('t("Preview penuh", "Full preview")');
  });
});
