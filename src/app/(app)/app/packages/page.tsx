import { getWorkspacePackages } from "@/lib/actions/packages";
import { PackageCatalog, type CatalogPackage } from "@/components/packages/package-catalog";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const [rows, ws] = await Promise.all([
    getWorkspacePackages(),
    getWorkspaceFullForCurrentUser(),
  ]);

  const packages: CatalogPackage[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    hours: p.hours,
    price: p.price,
    currency: p.currency,
    description: p.description,
    features: p.features,
    badge: p.badge,
    sortOrder: p.sortOrder,
    active: p.active,
    allowCustom: p.allowCustom,
    minHours: p.minHours,
    maxHours: p.maxHours,
  }));

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <PackageCatalog packages={packages} defaultCurrency={ws.defaultCurrency || "IDR"} />
    </div>
  );
}
