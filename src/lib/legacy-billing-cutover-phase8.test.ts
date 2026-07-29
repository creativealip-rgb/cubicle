import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyLegacyBillingClassification, resolveCutoverBillingModel } from "./legacy-billing-cutover";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("legacy billing cutover Phase 8", () => {
  it("uses reviewed classification for legacy_package reads", () => {
    expect(resolveCutoverBillingModel({ billingModel: "legacy_package", billingType: "package", targetBillingModel: "retainer" })).toBe("retainer");
    expect(resolveCutoverBillingModel({ billingModel: "legacy_package", billingType: "package", targetBillingModel: "fixed_price" })).toBe("fixed_price");
  });

  it("fails closed when legacy package has no classification", () => {
    expect(() => resolveCutoverBillingModel({ billingModel: "legacy_package", billingType: "package", targetBillingModel: null })).toThrow("Project Paket legacy belum diklasifikasikan");
  });

  it("applies only valid cutover targets and preserves legacy evidence", () => {
    expect(applyLegacyBillingClassification({ legacyBillingType: "package", targetBillingModel: "retainer", confidence: "manual", evidence: { source: "audit" } })).toEqual({ billingModel: "retainer", billingType: "package" });
    expect(() => applyLegacyBillingClassification({ legacyBillingType: "package", targetBillingModel: null, confidence: "blocked", evidence: {} })).toThrow("Target klasifikasi wajib fixed_price atau retainer");
  });

  it("wires tenant-scoped classification actions and project cutover", () => {
    const actions = read("src/lib/actions/legacy-billing-classifications.ts");
    expect(actions).toContain("export async function reviewLegacyBillingClassification");
    expect(actions).toContain("export async function applyLegacyBillingCutover");
    expect(actions).toContain("assertWorkspaceWritable");
    expect(actions).toContain("legacyProjectBillingClassifications.workspaceId");
    expect(actions).toContain("eq(projects.billingModel, \"legacy_package\")");
    expect(actions).toContain("targetBillingModel");
    expect(actions).toContain("reviewedBy: user.id");
    expect(actions).toContain("reviewedAt: new Date()");
    expect(actions).toContain("billingModel: cutover.billingModel");
    expect(actions).toContain("billingType: \"package\"");
  });
});
