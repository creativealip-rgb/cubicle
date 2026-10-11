import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tabs = readFileSync("src/components/portal/portal-tabs.tsx", "utf8");
const contact = readFileSync("src/components/portal/portal-contact.tsx", "utf8");

describe("portal contact dialog polish", () => {
  it("uses a descriptive dialog heading", () => {
    expect(tabs).toContain('t("Kontak", "Contact")');
    expect(tabs).toContain("<TabsContent value=\"contact\"");
  });

  it("renders compact contact actions as full-width channel rows", () => {
    expect(contact).toContain("Hubungi ${who}");
    expect(contact).toContain("flex items-center justify-between");
    expect(contact).toContain('t("Respon Cepat", "Fast Response")');
  });

  it("explains that project context is included", () => {
    expect(contact).toContain("konteks proyek kamu");
  });
});
