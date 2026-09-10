import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dialog = readFileSync("src/components/clients/client-edit-dialog.tsx", "utf8");
const form = readFileSync("src/components/forms/client-form.tsx", "utf8");

describe("Edit Client balanced desktop dialog", () => {
  it("uses a wider compact dialog shell", () => {
    expect(dialog).toContain("max-w-4xl");
    expect(dialog).toContain("md:overflow-hidden");
  });

  it("balances edit fields across two desktop columns", () => {
    expect(form).toContain('data-testid="client-edit-left-column"');
    expect(form).toContain('data-testid="client-edit-right-column"');
    expect(form).toContain("md:grid-cols-2");
    expect(form).toContain("rows={3}");
    expect(form).toContain("resize-none");
  });
});
