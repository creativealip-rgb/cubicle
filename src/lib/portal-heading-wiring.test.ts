import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("client portal heading", () => {
  it("prioritizes client identity and attributes the workspace", () => {
    const page = read("src/app/client-portal/[token]/page.tsx");
    expect(page).toContain("{client.companyName || client.name}");
    expect(page).toContain('t("Dikelola oleh", "Managed by")');
    expect(page).not.toContain("workspaceContact.billingAddress && (");
    expect(page).not.toContain("[workspaceContact.email, workspaceContact.phone]");
  });

  it("uses a compact language switch", () => {
    const component = read("src/components/portal/portal-language-switch.tsx");
    expect(component).toContain('"h-7 min-w-8 rounded-md px-2 text-[11px]');
    expect(component).not.toContain("min-h-11 min-w-11");
  });
});
