import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const sync = () => read("src/lib/pakasir-sync.ts");
const provider = () => read("src/lib/pakasir.ts");

function expirySection() {
  const src = sync();
  const start = src.indexOf("// Fail-closed: only a provider-confirmed");
  return src.slice(start, src.indexOf("const paidAt ="));
}

describe("Pakasir payment expiry: stale pending rows close out as expired, never activate", () => {
  it("provider status 'expired' triggers a pending -> expired update and returns outcome expired", () => {
    const section = expirySection();
    expect(section).toContain('verifiedStatus === "expired"');
    expect(section).toContain('.set({ status: "expired"');
    expect(section).toMatch(/outcome: "expired" as const/);
  });

  it("expiry transition is conditional on the row still being pending (concurrency-safe)", () => {
    const section = expirySection();
    // The UPDATE must guard on status = 'pending' so a concurrent webhook
    // completion cannot be overwritten by the cron's expiry path.
    expect(section).toContain("eq(pakasirPayments.status, \"pending\")");
    expect(section).toContain(".returning({ id: pakasirPayments.id })");
    // Expired outcome is only reported when the conditional update actually
    // transitioned the row; otherwise the ignored outcome is returned.
    expect(section).toMatch(/updated\.length === 1/);
  });

  it("a provider-supplied expired_at in the past expires the row even when status reads completed", () => {
    const section = expirySection();
    expect(section).toContain("transaction?.expired_at");
    expect(section).toContain("new Date(transaction.expired_at)");
    expect(section).toMatch(/expiredAt\.getTime\(\) <= Date\.now\(\)/);
  });

  it("expired_at check runs BEFORE any activation work", () => {
    const src = sync();
    const statusExpiry = src.indexOf('verifiedStatus === "expired"');
    const timeExpiry = src.indexOf("transaction?.expired_at");
    const activationCall = src.indexOf("activateCompletedPakasirPayment(payment.id, {");
    expect(statusExpiry).toBeGreaterThan(-1);
    expect(timeExpiry).toBeGreaterThan(-1);
    expect(activationCall).toBeGreaterThan(-1);
    // Both expiry guards must precede the shared activation helper call.
    expect(statusExpiry).toBeLessThan(activationCall);
    expect(timeExpiry).toBeLessThan(activationCall);
  });

  it("completed payments short-circuit before any provider fetch, so they are never expired", () => {
    const src = sync();
    const completedShortCircuit = src.indexOf('if (payment.status === "completed")');
    const providerFetch = src.indexOf("getPakasirTransactionDetail({");
    expect(completedShortCircuit).toBeGreaterThan(-1);
    expect(completedShortCircuit).toBeLessThan(providerFetch);
  });

  it("sync report carries an expired counter", () => {
    const src = sync();
    expect(src).toMatch(/expired: number;/);
    expect(src).toMatch(/expired: summarize\("expired"\)/);
  });

  it("provider transaction type exposes optional expired_at", () => {
    const src = provider();
    expect(src).toMatch(/expired_at\?: string;/);
  });
});
