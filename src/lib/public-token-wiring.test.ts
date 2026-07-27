import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("public token lifecycle wiring", () => {
  it("applies shared lifecycle policy before proposal acceptance replay", () => {
    const source = read("src/lib/actions/proposals.ts");
    const accept = source.slice(
      source.indexOf("export async function acceptProposalPublic"),
      source.indexOf("export async function declineProposalPublic"),
    );
    expect(accept).toContain("assertPublicTokenLifecycle");
    expect(accept.indexOf("assertPublicTokenLifecycle")).toBeLessThan(
      accept.indexOf('p.status === "accepted"'),
    );
  });

  it("applies shared lifecycle policy to proposal decline", () => {
    const source = read("src/lib/actions/proposals.ts");
    const decline = source.slice(source.indexOf("export async function declineProposalPublic"));
    expect(decline).toContain("assertPublicTokenLifecycle");
    expect(decline).toContain("sharedTokenRevokedAt");
    expect(decline).toContain("sharedTokenExpiresAt");
    expect(decline).toContain('allowedStatuses: ["sent", "viewed", "declined"]');
    expect(decline.indexOf("assertPublicTokenLifecycle")).toBeLessThan(
      decline.indexOf('p.status === "declined"'),
    );
  });

  it("applies shared lifecycle policy to contract decline", () => {
    const source = read("src/lib/actions/contracts.ts");
    const decline = source.slice(source.indexOf("export async function declineContract"));
    expect(decline).toContain("assertPublicTokenLifecycle");
    expect(decline).toContain("sharedTokenRevokedAt");
    expect(decline).toContain("sharedTokenExpiresAt");
    expect(decline).toContain('allowedStatuses: ["sent", "viewed"]');
  });

  it("applies shared lifecycle policy before contract signed-state rejection", () => {
    const source = read("src/lib/actions/contracts.ts");
    const sign = source.slice(
      source.indexOf("export async function signContract"),
      source.indexOf("export async function declineContract"),
    );
    expect(sign).toContain("assertPublicTokenLifecycle");
    expect(sign.indexOf("assertPublicTokenLifecycle")).toBeLessThan(
      sign.indexOf('c.status === "signed"'),
    );
  });

  it("binds portal file token to requested file client or project", () => {
    const source = read("src/app/api/files/[fileId]/download/route.ts");
    expect(source).toContain("eq(files.id, file.id)");
    expect(source).toContain("eq(clients.portalTokenHash, tokenHash)");
    expect(source).toContain("eq(clients.portalEnabled, true)");
    expect(source).toContain("isNull(clients.portalTokenRevokedAt)");
    expect(source).toContain("gt(clients.portalTokenExpiresAt, new Date())");
  });

  it("binds invoice share token directly to one invoice and enforces lifecycle", () => {
    const source = read("src/app/api/invoices/share/[token]/pdf/route.ts");
    expect(source).toContain("eq(invoices.sharedTokenHash, tokenHash)");
    expect(source).toContain("inv.sharedTokenRevokedAt");
    expect(source).toContain("inv.sharedTokenExpiresAt");
    expect(source).toContain('inv.status === "cancelled"');
  });
});
