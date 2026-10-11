import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  "src/app/client-portal/[token]/page.tsx",
  "utf8",
);
const tabs = readFileSync(
  "src/components/portal/portal-tabs.tsx",
  "utf8",
);

describe("client portal contact action", () => {
  it("opens compact contact actions from a dialog button, not a tab", () => {
    expect(page).toContain("<PortalContactButtons");
    expect(page).toContain("contact=");
    expect(tabs).toContain('key: "contact"');
    expect(tabs).toContain('<TabsContent value="contact"');
  });
});
