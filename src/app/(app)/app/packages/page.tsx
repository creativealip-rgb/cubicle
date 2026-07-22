import { getWorkspacePackages } from "@/lib/actions/packages";
import { PackageCatalog, type CatalogPackage } from "@/components/packages/package-catalog";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { db } from "@/db";
import { workspaceCurrencyRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  buildRateMap,
  convertToBase,
  normalizeCurrency,
} from "@/lib/currency-base";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const [rows, ws] = await Promise.all([
    getWorkspacePackages(),
    getWorkspaceFullForCurrentUser(),
  ]);

  const baseCurrency = normalizeCurrency(ws.defaultCurrency || "IDR");
  const showApprox = ws.showBaseCurrencyApprox !== false;
  const rateRows = showApprox
    ? await db
        .select({
          fromCurrency: workspaceCurrencyRates.fromCurrency,
          rate: workspaceCurrencyRates.rate,
        })
        .from(workspaceCurrencyRates)
        .where(eq(workspaceCurrencyRates.workspaceId, ws.id))
    : [];
  const rateMap = buildRateMap(rateRows);

  const packages: CatalogPackage[] = rows.map((p) => {
    const priceBase = showApprox
      ? convertToBase(Number(p.price) || 0, p.currency, baseCurrency, rateMap)
      : null;
    return {
      id: p.id,
      name: p.name,
      hours: p.hours,
      price: p.price,
      currency: p.currency,
      priceBase,
      description: p.description,
      features: p.features,
      badge: p.badge,
      sortOrder: p.sortOrder,
      active: p.active,
      allowCustom: p.allowCustom,
      minHours: p.minHours,
      maxHours: p.maxHours,
    };
  });

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <PackageCatalog
        packages={packages}
        defaultCurrency={ws.defaultCurrency || "IDR"}
        baseCurrency={baseCurrency}
      />
    </div>
  );
}
