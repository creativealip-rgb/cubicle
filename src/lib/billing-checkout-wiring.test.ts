import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const checkout = readFileSync(
  join(process.cwd(), "src/app/api/billing/checkout/route.ts"),
  "utf8",
);
const checkoutExtra = readFileSync(
  join(process.cwd(), "src/app/api/billing/checkout-extra-workspace/route.ts"),
  "utf8",
);
const webhook = readFileSync(
  join(process.cwd(), "src/app/api/webhooks/pakasir/route.ts"),
  "utf8",
);
const pakasirSync = readFileSync(
  join(process.cwd(), "src/lib/pakasir-sync.ts"),
  "utf8",
);

describe("checkout monthly/yearly period wiring", () => {
  it("accepts period from request body and defaults to yearly", () => {
    expect(checkout).toContain('body.period || "yearly"');
    expect(checkout).toMatch(/period !== "monthly" && period !== "yearly"/);
  });

  it("quotes amount from selected period", () => {
    expect(checkout).toContain("getPlanAmount(plan");
    expect(checkout).toMatch(/getPlanAmount\(plan as Exclude<BillingPlan, "free">, period\)/);
  });

  it("persists billing period on the payment row", () => {
    expect(checkout).toMatch(/billingPeriod:\s*period/);
  });
});

describe("checkout order ID collision safety", () => {
  it("includes a random component so same-ms double checkout cannot collide", () => {
    expect(checkout).toMatch(/randomBytes\(/);
    expect(checkout).toMatch(/Date\.now\(\)/);
    expect(checkout).toMatch(/orderId = `CUB-/);
  });
});

describe("webhook expiry honors payment billing period", () => {
  it("computes expiry from the persisted billing period, not a fixed year", () => {
    // The activation transaction is shared (src/lib/pakasir-sync.ts) so both
    // the webhook and the missed-webhook recovery cron honor billing period.
    expect(pakasirSync).toContain("getPeriodExpiry(paidAt, current.billingPeriod)");
    expect(pakasirSync).not.toContain("annualPlanExpiry(paidAt)");
    expect(webhook).toContain("activateCompletedPakasirPayment(payment.id, {");
  });
});

describe("checkout routes: same-origin guard wiring", () => {
  for (const [name, source] of [
    ["checkout", checkout],
    ["checkout-extra-workspace", checkoutExtra],
  ] as const) {
    it(`${name} rejects cross-origin POSTs before any provider work`, () => {
      // The guard must run BEFORE the provider config check / transaction
      // creation, so a CSRF attempt never reaches Pakasir.
      expect(source).toContain('import { assertSameOrigin } from "@/lib/same-origin";');
      expect(source).toContain("assertSameOrigin(request, {");
      expect(source).toContain("appUrl: process.env.NEXT_PUBLIC_APP_URL");
      expect(source).toContain('devOrigin: "https://dev.cubiqlo.com"');
      expect(source).toMatch(/} catch \{[\s\S]*status: 403/);
      expect(source).toMatch(/isPakasirConfigured[\s\S]*assertSameOrigin|assertSameOrigin[\s\S]*isPakasirConfigured/);
    });
  }
});

describe("checkout-extra-workspace owner-role guard", () => {
  it("rejects non-owner roles before creating the payment row", () => {
    // Owner check must run before the provider call and the insert, mirroring
    // the main checkout route's storage-addon path.
    expect(checkoutExtra).toContain('membership.role !== "owner"');
    expect(checkoutExtra).toMatch(/Hanya pemilik workspace yang dapat melakukan pembayaran\./);
    const ownerCheckIdx = checkoutExtra.indexOf('membership.role !== "owner"');
    const providerCallIdx = checkoutExtra.indexOf("createPakasirTransaction(");
    const insertIdx = checkoutExtra.indexOf("db.insert(pakasirPayments)");
    expect(ownerCheckIdx).toBeGreaterThan(-1);
    expect(providerCallIdx).toBeGreaterThan(ownerCheckIdx);
    expect(insertIdx).toBeGreaterThan(ownerCheckIdx);
  });
});
