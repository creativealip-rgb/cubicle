import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  allowsTimeInvoice,
  allowsTimeTracking,
  defaultTaskBehavior,
  resolveBillingModel,
} from "./billing-model";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("billing model compatibility", () => {
  it("wires additive migration and Drizzle schema", () => {
    const migration = read("drizzle/0056_billing_model_compatibility.sql");
    const schema = read("src/db/schema.ts");

    expect(migration).toContain("ADD COLUMN IF NOT EXISTS billing_model text");
    expect(migration).toContain("projects_billing_model_check");
    expect(migration).toContain("WHEN billing_type = 'project' THEN 'fixed_price'");
    expect(migration).toContain("WHEN billing_type = 'hours' THEN 'hourly'");
    expect(migration).toContain("WHEN billing_type = 'package' THEN 'legacy_package'");
    expect(migration).toContain("projects_workspace_billing_model_idx");
    expect(schema).toContain('billingModel: text("billing_model"');
  });

  it("prefers canonical values and maps legacy values", () => {
    expect(resolveBillingModel({ billingModel: "retainer", billingType: "project" })).toBe("retainer");
    expect(resolveBillingModel({ billingModel: null, billingType: "project" })).toBe("fixed_price");
    expect(resolveBillingModel({ billingModel: null, billingType: "hours" })).toBe("hourly");
    expect(resolveBillingModel({ billingModel: null, billingType: "package" })).toBe("legacy_package");
  });

  it("fails closed for unknown models", () => {
    expect(() => resolveBillingModel({ billingModel: "other", billingType: "hours" })).toThrow(
      "Model billing Project tidak didukung",
    );
    expect(() => resolveBillingModel({ billingModel: null, billingType: null })).toThrow(
      "Model billing Project tidak didukung",
    );
  });

  it("allows time only for hourly and retainer", () => {
    expect(allowsTimeTracking("fixed_price")).toBe(false);
    expect(allowsTimeTracking("legacy_package")).toBe(false);
    expect(allowsTimeTracking("hourly")).toBe(true);
    expect(allowsTimeTracking("retainer")).toBe(true);
    expect(allowsTimeInvoice("hourly")).toBe(true);
    expect(allowsTimeInvoice("retainer")).toBe(false);
    expect(defaultTaskBehavior("fixed_price")).toBe("one_time");
    expect(defaultTaskBehavior("hourly")).toBe("recurring");
  });
});
