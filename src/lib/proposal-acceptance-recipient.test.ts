import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/actions/proposals.ts", "utf8");
const body = source.slice(
  source.indexOf("export async function acceptProposalPublic"),
  source.indexOf("export async function declineProposalPublic"),
);

describe("proposal acceptance recipient guard", () => {
  it("resolves a linked Client before creating project and invoice", () => {
    expect(body).toContain("let clientId = p.clientId");
    expect(body).toContain("if (!clientId)");
    expect(body).toContain("clientId,");
  });

  it("reuses an email-matched Client before creating one", () => {
    expect(body).toContain("existingClient");
    expect(body).toContain("tx.insert(clients)");
  });
});
