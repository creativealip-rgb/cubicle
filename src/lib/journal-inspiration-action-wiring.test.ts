import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const quote = readFileSync("src/components/journal/daily-quote-card.tsx", "utf8");
const prompt = readFileSync("src/components/journal/journal-inspiration-banner.tsx", "utf8");
const composer = readFileSync("src/components/journal/journal-composer-dialog.tsx", "utf8");
const page = readFileSync("src/app/(app)/app/journal/page.tsx", "utf8");

describe("journal inspiration actions", () => {
  it("separates passive quote from actionable reflection", () => {
    expect(quote).not.toContain('" · AI"');
    expect(prompt).toContain('t("Tulis refleksi", "Write a reflection")');
    expect(prompt).toContain('new CustomEvent("journal:write-reflection"');
    expect(composer).toContain('window.addEventListener("journal:write-reflection"');
    expect(composer).toContain("setBody(`${prompt}\\n\\n`)");
    expect(page).toContain("<JournalInspirationBanner lang={lang}");
    expect(page).not.toContain("<JournalInspirationBanner t={t}");
  });
});