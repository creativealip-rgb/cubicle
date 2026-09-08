import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const form = readFileSync("src/components/forms/project-form.tsx", "utf8");
const dialog = readFileSync("src/components/projects/project-create-dialog.tsx", "utf8");
const time = readFileSync("src/components/time/timesheet.tsx", "utf8");
describe("My Hours UI polish", () => {
  it("uses compact single-column quick project modal", () => {
    expect(dialog).toContain("sm:max-w-md");
    expect(form).toContain('mode === "create" ? "grid-cols-1"');
  });
  it("keeps row editing direct without redundant action toolbar", () => {
    expect(time).toContain("onClick={() => canEditEntry(entry) && openEdit(entry)}");
    expect(time).not.toContain("aria-label={t(\"Mulai lagi\", \"Start again\")}");
  });
});
