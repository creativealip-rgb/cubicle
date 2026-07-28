export const BILLING_MODELS = [
  "fixed_price",
  "hourly",
  "retainer",
  "legacy_package",
] as const;

export type BillingModel = (typeof BILLING_MODELS)[number];
export type TaskBehavior = "one_time" | "recurring";

const BILLING_MODEL_LABELS: Record<BillingModel, string> = {
  fixed_price: "Harga Tetap",
  hourly: "Per Jam",
  retainer: "Retainer",
  legacy_package: "Paket Legacy",
};

function isBillingModel(value: string | null | undefined): value is BillingModel {
  return BILLING_MODELS.includes(value as BillingModel);
}

export function resolveBillingModel(input: {
  billingModel: string | null | undefined;
  billingType: string | null | undefined;
}): BillingModel {
  if (input.billingModel != null) {
    if (isBillingModel(input.billingModel)) return input.billingModel;
    throw new Error("Model billing Project tidak didukung");
  }

  if (input.billingType === "project") return "fixed_price";
  if (input.billingType === "hours") return "hourly";
  if (input.billingType === "package") return "legacy_package";
  throw new Error("Model billing Project tidak didukung");
}

export function allowsTimeTracking(model: BillingModel): boolean {
  return model === "hourly" || model === "retainer";
}

export function allowsTimeInvoice(model: BillingModel): boolean {
  return model === "hourly";
}

export function defaultTaskBehavior(model: BillingModel): TaskBehavior {
  return model === "fixed_price" ? "one_time" : "recurring";
}

export function billingModelLabel(model: BillingModel): string {
  return BILLING_MODEL_LABELS[model];
}

export function assertSupportedBillingModel(model: BillingModel): void {
  if (model === "legacy_package") {
    throw new Error("Project Paket legacy harus diklasifikasikan sebelum menerima perubahan baru");
  }
}

export function assertBillingModelAllowsTime(model: BillingModel): void {
  if (!allowsTimeTracking(model)) {
    if (model === "fixed_price") {
      throw new Error("Project Harga Tetap tidak mendukung pelacakan waktu");
    }
    throw new Error("Project Paket legacy harus diklasifikasikan sebelum mencatat waktu");
  }
}

export function assertBillingModelAllowsTimeInvoice(model: BillingModel): void {
  if (!allowsTimeInvoice(model)) {
    throw new Error("Hanya Project Per Jam yang dapat mengimpor time entry ke invoice");
  }
}
