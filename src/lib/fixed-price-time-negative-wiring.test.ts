import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("billing-aware time containment", () => {
  it("resolves canonical billing policy for all time mutation paths", () => {
    const policy = read("src/lib/project-time-tracking-policy-db.ts");
    const time = read("src/lib/actions/time.ts");

    expect(policy).toContain("projects.billingModel");
    expect(policy).toContain("resolveBillingModel");
    expect(policy).toContain("assertBillingModelAllowsTime");
    expect(time.match(/assertProjectTimeTrackingEnabled/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(time.match(/assertHistoricalTimeEntryMutable/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("filters active-time options by canonical billing policy", () => {
    const route = read("src/app/api/time/active/route.ts");
    expect(route).toContain("billingModel: projects.billingModel");
    expect(route).toContain("allowsTimeTracking(resolveBillingModel(project))");
  });

  it("guards invoice time sources by project billing model", () => {
    const invoices = read("src/lib/actions/invoices.ts");
    expect(invoices).toContain("assertBillingModelAllowsTimeInvoice");
    expect(invoices).toContain("billingModel: projects.billingModel");
  });
});
