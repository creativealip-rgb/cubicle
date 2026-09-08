import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const form = readFileSync("src/components/forms/client-form.tsx", "utf8");
const dialog = readFileSync("src/components/clients/client-create-dialog.tsx", "utf8");

describe("progressive Add Client form", () => {
  it("uses a compact create mode with primary fields and progressive details", () => {
    expect(form).toContain('mode === "create"');
    expect(form).toContain('autoFocus');
    expect(form).toContain('t("Detail lainnya", "More details")');
    expect(form).toContain('aria-expanded={showMoreDetails}');
  });

  it("keeps portal settings out of the create flow", () => {
    expect(form.indexOf('if (mode === "create")')).toBeLessThan(form.indexOf('t("Portal Klien", "Client Portal")'));
    expect(form).toContain('t("Portal Klien", "Client Portal")');
  });

  it("supports explicit cancellation and a compact create dialog", () => {
    expect(form).toContain("onCancel?: () => void");
    expect(form).toContain('t("Batal", "Cancel")');
    expect(dialog).toContain("onCancel={() => setOpen(false)}");
    expect(dialog).toContain("max-w-lg");
  });

  it("rejects a whitespace-only client name", () => {
    expect(form).toContain("const name = form.name.trim()");
    expect(form).toContain('t("Nama klien wajib diisi", "Client name is required")');
  });
});
