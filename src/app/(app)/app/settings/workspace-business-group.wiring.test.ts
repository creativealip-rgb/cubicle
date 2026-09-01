import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(__dirname + "/page.tsx", "utf8");
const form = readFileSync(__dirname + "/../../../../components/settings/workspace-branding-form.tsx", "utf8");

describe("workspace business settings", () => {
  it("groups business identity fields with concise labels", () => {
    expect(form).toContain('data-testid="workspace-business-group"');
    expect(form).toContain('t("Bisnis", "Business")');
    expect(form).toContain('t("Nama", "Name")');
    expect(form).toContain('t("Email", "Email")');
    expect(form).not.toContain('t("Nama tagihan", "Billing name")');
    expect(form).not.toContain('t("Email tagihan", "Billing email")');
  });

  it("does not repeat invoice currency and tax defaults on workspace tab", () => {
    expect(page).not.toContain('t("Mata Uang", "Currency")');
    expect(page).not.toContain('t("Pajak", "Tax")');
    expect(page).not.toContain("Change invoice defaults in the Invoice tab.");
  });
});
