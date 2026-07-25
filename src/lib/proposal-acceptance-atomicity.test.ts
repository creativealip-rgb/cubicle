import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/lib/actions/proposals.ts"), "utf8");

function functionBody(name: string) {
  const start = source.indexOf(`export async function ${name}`);
  if (start < 0) throw new Error(`${name} not found`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

describe("proposal acceptance atomicity wiring", () => {
  const body = functionBody("acceptProposalPublic");

  it("serializes acceptance by locking proposal inside one transaction", () => {
    expect(body).toContain("db.transaction");
    expect(body).toContain("FOR UPDATE");
    expect(body.indexOf("FOR UPDATE")).toBeLessThan(body.indexOf("status === \"accepted\""));
  });

  it("keeps every acceptance write on transaction client", () => {
    expect(body).not.toMatch(/await db\.(insert|update|delete)/);
    expect(body).toContain("tx.insert(projects)");
    expect(body).toContain("tx.insert(invoices)");
    expect(body).toContain("tx.insert(invoiceItems)");
    expect(body).toContain("tx.update(proposals)");
  });

  it("allocates invoice number atomically and supports safe replay", () => {
    expect(body).toContain("onConflictDoUpdate");
    expect(body).toContain("alreadyAccepted: true");
  });
});
