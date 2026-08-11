import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const checkout = readFileSync(
  join(process.cwd(), "src/app/api/billing/checkout/route.ts"),
  "utf8",
);
const webhook = readFileSync(
  join(process.cwd(), "src/app/api/webhooks/pakasir/route.ts"),
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
    expect(webhook).toContain("getPeriodExpiry(paidAt, payment.billingPeriod)");
    expect(webhook).not.toContain("annualPlanExpiry(paidAt)");
  });
});
