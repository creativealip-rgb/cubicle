import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const qDir = join(process.cwd(), "src/app/(app)/app/questionnaires");

const source = (name: string) => readFileSync(join(qDir, name), "utf8");

describe("questionnaire pages share the app page chrome", () => {
  it("list page uses the shared app page header (no double padding)", () => {
    const page = source("page.tsx");
    expect(page).toContain('className="min-w-0 space-y-4 sm:space-y-6"');
    expect(page).toContain('className="app-page-header"');
    expect(page).not.toMatch(/<div className="space-y-6 p-4 sm:p-6">/);
  });

  it("detail page uses app-page-title + localized back link + full-width container", () => {
    const page = source("[questionnaireId]/page.tsx");
    expect(page).toContain('className="min-w-0 space-y-6"');
    expect(page).not.toMatch(/<div className="space-y-6 p-6 max-w-4xl">/);
    expect(page).toContain("Kembali ke Kuesioner");
    expect(page).toContain("Back to Questionnaires");
  });

  it("new and edit pages share the form header pattern (back + title + description, localized)", () => {
    const newPage = source("new/page.tsx");
    const editPage = source("[questionnaireId]/edit/page.tsx");
    expect(newPage).toContain('className="space-y-6 p-6 max-w-4xl"');
    expect(newPage).toContain("Semua kuesioner");
    expect(newPage).toContain("All questionnaires");
    expect(editPage).toContain('className="space-y-6 p-6 max-w-4xl"');
    expect(editPage).toContain("Kembali ke kuesioner");
    expect(editPage).toContain("Back to questionnaire");
    expect(editPage).not.toContain('max-w-3xl');
  });

  it("detail page strings are localized (no bare English labels)", () => {
    const page = source("[questionnaireId]/page.tsx");
    expect(page).toContain('t("Pratinjau form", "Form preview")');
    expect(page).toContain('t("Jawaban", "Responses")');
    expect(page).not.toMatch(/>\s*Back\s*</);
    expect(page).not.toMatch(/>\s*Responses\s*</);
  });
});
