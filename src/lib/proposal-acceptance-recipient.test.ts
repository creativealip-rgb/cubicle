import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/actions/proposals.ts", "utf8");
const body = source.slice(
  source.indexOf("export async function acceptProposalPublic"),
  source.indexOf("export async function declineProposalPublic"),
);

describe("proposal acceptance recipient guard", () => {
  it("requires linked Client before creating project and invoice", () => {
    expect(body).toContain('if (!p.clientId) throw new Error("Proposal recipient is not linked to a Client");');
    expect(body).toContain("clientId: p.clientId");
  });

  it("keeps proposal acceptance free of implicit Client creation", () => {
    expect(body).not.toContain("createClient(");
    expect(body).not.toContain("createClientFromSignedContract");
  });
});
