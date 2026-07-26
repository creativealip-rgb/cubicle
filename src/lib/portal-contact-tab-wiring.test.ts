import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  "src/app/client-portal/[token]/page.tsx",
  "utf8",
);

describe("client portal contact tab", () => {
  it("renders only compact contact actions", () => {
    const contact = page.slice(page.indexOf("contact={"), page.indexOf("                  }", page.indexOf("contact={")));
    expect(contact).toContain("<PortalContactButtons");
    expect(contact).toContain("compact");
    expect(contact).not.toContain("<CardHeader>");
    expect(contact).not.toContain("Hubungi Tim");
  });
});
