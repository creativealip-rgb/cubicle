import { resolveBillingModel, type BillingModel } from "@/lib/billing-model";

type CutoverInput = {
  billingModel: string | null | undefined;
  billingType: string | null | undefined;
  targetBillingModel?: string | null;
};

export function resolveCutoverBillingModel(input: CutoverInput): BillingModel {
  const current = resolveBillingModel(input);
  if (current !== "legacy_package") return current;
  if (input.targetBillingModel === "fixed_price" || input.targetBillingModel === "retainer") {
    return input.targetBillingModel;
  }
  throw new Error("Project Paket legacy belum diklasifikasikan");
}

export function applyLegacyBillingClassification(input: {
  legacyBillingType: string;
  targetBillingModel: string | null | undefined;
  confidence: string;
  evidence: unknown;
}): { billingModel: "fixed_price" | "retainer"; billingType: "package" } {
  if (input.legacyBillingType !== "package") throw new Error("Hanya Project Paket legacy yang bisa diklasifikasikan");
  if (input.targetBillingModel !== "fixed_price" && input.targetBillingModel !== "retainer") {
    throw new Error("Target klasifikasi wajib fixed_price atau retainer");
  }
  return { billingModel: input.targetBillingModel, billingType: "package" };
}
