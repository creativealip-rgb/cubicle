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
  billingModel?: string | null | undefined;
  billingType?: string | null | undefined;
}): BillingModel {
  if (input.billingModel != null) {
    if (isBillingModel(input.billingModel)) return input.billingModel;
    throw new Error("Model billing Project tidak didukung");
  }

  if (input.billingType === "project" || input.billingType === "fixed_price") return "fixed_price";
  if (input.billingType === "hours" || input.billingType === "hourly") return "hourly";
  if (input.billingType === "package" || input.billingType === "legacy_package") return "legacy_package";
  if (input.billingType === "retainer") return "retainer";
  throw new Error("Model billing Project tidak didukung");
}

export function allowsTimeTracking(model: BillingModel): boolean {
  return model === "hourly" || model === "retainer";
}

/**
 * Client-side selector gate mirroring server `assertBillingModelAllowsTime`.
 * Fixed Price and legacy Package projects never appear in Timer/Timesheet
 * project selectors, even when legacy `timeTrackingMode` is not "off".
 * Inputs mirror the projects row so callers can pass raw row values.
 */
export function allowsTimeTrackingProject(input: {
  billingModel?: string | null | undefined;
  billingType?: string | null | undefined;
}): boolean {
  try {
    return allowsTimeTracking(resolveBillingModel(input));
  } catch {
    // Unknown/legacy-ambiguous model: fail closed — never offer time entry.
    return false;
  }
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
