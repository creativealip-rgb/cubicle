export type ServiceCatalogSnapshotSource = {
  id: string;
  name: string;
  description?: string | null;
  defaultPricingModel: "fixed" | "hourly" | "unit";
  defaultUnit: string;
  defaultPrice?: string | number | null;
  currency: string;
};

export function normalizeCatalogName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildProjectServiceSnapshot(
  service: ServiceCatalogSnapshotSource,
  overrides: {
    quantity?: number | null;
    unit?: string | null;
    unitPriceOverride?: number | null;
    includedAllowance?: number | null;
    sortOrder?: number | null;
  } = {},
) {
  const quantity = overrides.quantity ?? 1;
  const unitPrice =
    overrides.unitPriceOverride ??
    (service.defaultPrice == null ? null : Number(service.defaultPrice));
  return {
    serviceId: service.id,
    nameSnapshot: service.name,
    descriptionSnapshot: service.description ?? null,
    pricingModelSnapshot: service.defaultPricingModel,
    quantity: String(quantity),
    unit: overrides.unit || service.defaultUnit || "service",
    unitPrice: unitPrice == null ? null : String(unitPrice),
    currencySnapshot: service.currency || "IDR",
    amount: unitPrice == null ? null : String(unitPrice * quantity),
    includedAllowance:
      overrides.includedAllowance == null ? null : String(overrides.includedAllowance),
    sortOrder: overrides.sortOrder ?? 0,
    status: "active" as const,
  };
}
