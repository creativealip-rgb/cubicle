import { describe, it, expect } from "vitest";
import * as fs from "fs";

describe("Notes and Journal Dashboard Contracts", () => {
  it("Notes page uses on-demand editor dialog and modern tab track without split layout", () => {
    const pageContent = fs.readFileSync(
      "src/app/(app)/app/personal/page.tsx",
      "utf8"
    );
    expect(pageContent).toContain("NoteEditorDialog");
    expect(pageContent).toContain("NotesSummaryStrip");
    expect(pageContent).not.toContain("data-ui=\"notes-split-view\"");
  });

  it("Journal page uses on-demand composer dialog and modern tab track without split layout", () => {
    const pageContent = fs.readFileSync(
      "src/app/(app)/app/journal/page.tsx",
      "utf8"
    );
    expect(pageContent).toContain("JournalComposerDialog");
    expect(pageContent).toContain("JournalSummaryStrip");
    expect(pageContent).not.toContain("data-ui=\"journal-split-view\"");
  });
});
