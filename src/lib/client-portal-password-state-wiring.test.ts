import { describe, expect, it } from "vitest";
import fs from "node:fs";
const section = fs.readFileSync("src/app/(app)/app/clients/[clientId]/portal-section.tsx", "utf8");
const page = fs.readFileSync("src/app/(app)/app/clients/[clientId]/page.tsx", "utf8");
describe("Client Portal password UX", () => {
  it("renders truthful state copy and masked reveal controls", () => {
    expect(section).toContain("resolveClientPortalPasswordState");
    expect(section).toContain("Password lama tidak dapat ditampilkan");
    expect(section).toContain("••••••••");
    expect(section).toContain("Tampilkan password");
    expect(section).toContain("Sembunyikan password");
    expect(section).toContain("Salin password");
  });
  it("does not server-render plaintext", () => {
    expect(page).not.toContain("revealClientPortalPassword");
    expect(page).toContain("portalPasswordCiphertext");
  });
});
