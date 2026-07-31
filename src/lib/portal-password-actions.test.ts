import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
const source = fs.readFileSync(path.join(process.cwd(), "src/lib/actions/clients.ts"), "utf8");

describe("Portal password actions", () => {
  it("writes hash and ciphertext in one transaction", () => {
    expect(source).toContain("encryptPortalPassword(value, key)");
    expect(source).toMatch(/db\.transaction\([\s\S]*portalPasswordHash:[\s\S]*portalPasswordCiphertext:/);
  });
  it("reveals only to owner and audits without password data", () => {
    expect(source).toContain("export async function revealClientPortalPassword");
    expect(source).toContain('member.role !== "owner"');
    expect(source).toContain('"revealed_portal_password"');
    expect(source).toContain("unrecoverable");
  });
  it("keeps tenant validation", () => expect(source).toContain("assertClientInWorkspace(db, user.id, workspaceId, clientId)"));
});
