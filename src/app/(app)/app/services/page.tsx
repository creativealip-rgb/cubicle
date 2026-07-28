import { ServiceCatalog } from "@/components/services/service-catalog";
import { getServiceCategories, getWorkspaceServices } from "@/lib/actions/services";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";

export default async function ServicesPage() {
  const [rows, categories, ws] = await Promise.all([
    getWorkspaceServices({ includeArchived: true }),
    getServiceCategories(),
    getWorkspaceFullForCurrentUser(),
  ]);

  return (
    <ServiceCatalog
      services={rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        defaultPricingModel: row.defaultPricingModel,
        defaultUnit: row.defaultUnit,
        defaultPrice: row.defaultPrice,
        currency: row.currency,
        status: row.status,
      }))}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        sortOrder: category.sortOrder,
      }))}
      defaultCurrency={ws.defaultCurrency || "IDR"}
    />
  );
}
