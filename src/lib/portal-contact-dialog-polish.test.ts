import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tabs = readFileSync("src/components/portal/portal-tabs.tsx", "utf8");
const contact = readFileSync("src/components/portal/portal-contact.tsx", "utf8");

describe("portal contact dialog polish", () => {
  it("uses a descriptive dialog heading", () => {
    expect(tabs).toContain('t("Hubungi tim", "Contact team")');
    expect(tabs).toContain("DialogDescription");
  });

  it("renders compact contact actions as full-width channel rows", () => {
    expect(contact).toContain("Hubungi ${who}");
    expect(contact).toContain("w-full justify-between");
    expect(contact).toContain("Respons lebih cepat");
    expect(contact).toContain("ChevronRight");
  });

  it("explains that project context is included", () => {
    expect(contact).toContain("Pesan otomatis menyertakan konteks proyek kamu");
  });
});
