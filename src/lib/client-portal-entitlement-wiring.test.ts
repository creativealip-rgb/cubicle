import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/actions/clients.ts", "utf8");

describe("client portal entitlement wiring", () => {
  it("checks plan before enabling portal during client create", () => {
    expect(source).toContain("hasClientPortal");
    expect(source).toContain("portalEnabled");
    expect(source).toContain("Client portal tersedia di paket Solo dan Team");
  });

  it("checks plan before portal token/password enable actions", () => {
    expect(source).toContain("assertCanUseClientPortal");
    expect(source).toMatch(/generatePortalToken[\s\S]*assertCanUseClientPortal/);
    expect(source).toMatch(/setClientPortalPassword[\s\S]*assertCanUseClientPortal/);
  });
});
