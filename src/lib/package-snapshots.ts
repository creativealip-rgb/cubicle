import { buildProjectServiceSnapshot, type ServiceCatalogSnapshotSource } from "@/lib/service-snapshots";

export type PackageCatalogSnapshotSource = {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  currency: string;
  hours?: number | null;
  allowanceType?: "hours" | null;
  allowanceValue?: string | number | null;
  lifecycleClass?: "one_off" | "legacy_recurring_unmodeled" | null;
};

export type PackageItemSnapshotSource = {
  id: string;
  serviceId: string;
  quantity?: string | number | null;
  unit?: string | null;
  unitPrice?: string | number | null;
  currency?: string | null;
  includedAllowance?: string | number | null;
  sortOrder?: number | null;
  service: ServiceCatalogSnapshotSource;
};

function decimalOrNull(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  return String(value);
}

function numberOrNull(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolvePackageAllowanceValue(pkg: PackageCatalogSnapshotSource) {
  return decimalOrNull(pkg.allowanceValue ?? pkg.hours ?? null);
}

export function buildProjectPackageSnapshot(pkg: PackageCatalogSnapshotSource) {
  return {
    sourcePackageId: pkg.id,
    sourceLifecycleClass: pkg.lifecycleClass ?? "one_off",
    nameSnapshot: pkg.name,
    descriptionSnapshot: pkg.description ?? null,
    priceSnapshot: String(pkg.price),
    currencySnapshot: pkg.currency || "IDR",
    allowanceTypeSnapshot: pkg.allowanceType ?? "hours",
    allowanceValueSnapshot: resolvePackageAllowanceValue(pkg),
    status: "active" as const,
  };
}

export function buildProjectServiceSnapshotsFromPackage(
  packageItems: PackageItemSnapshotSource[],
  projectPackageAssignmentId: string,
) {
  return packageItems.map((item) => ({
    ...buildProjectServiceSnapshot(item.service, {
      quantity: numberOrNull(item.quantity) ?? 1,
      unit: item.unit || item.service.defaultUnit,
      unitPriceOverride: numberOrNull(item.unitPrice ?? item.service.defaultPrice),
      includedAllowance: numberOrNull(item.includedAllowance),
      sortOrder: item.sortOrder ?? 0,
    }),
    packageItemId: item.id,
    projectPackageAssignmentId,
    sourcePackageAssignmentId: projectPackageAssignmentId,
    currencySnapshot: item.currency || item.service.currency || "IDR",
  }));
}
