import { db } from "@/db";
import { services, serviceCategories } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { ServiceCatalog, type CatalogService, type ServicePricingModel } from "@/components/services/service-catalog";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function ServicesPage() {
  const workspaceId = await getWorkspaceForCurrentUser();
  const lang = await getCurrentLang();
  const t = createT(lang);

  const rawServices = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      categoryId: services.categoryId,
      categoryName: serviceCategories.name,
      defaultPricingModel: services.defaultPricingModel,
      defaultUnit: services.defaultUnit,
      defaultPrice: services.defaultPrice,
      currency: services.currency,
      status: services.status,
    })
    .from(services)
    .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .where(eq(services.workspaceId, workspaceId))
    .orderBy(desc(services.createdAt));

  const catalogServices: CatalogService[] = rawServices.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    categoryId: s.categoryId,
    categoryName: s.categoryName,
    defaultPricingModel: (s.defaultPricingModel as ServicePricingModel) ?? "fixed",
    defaultUnit: s.defaultUnit ?? "jam",
    defaultPrice: s.defaultPrice,
    currency: s.currency ?? "IDR",
    status: (s.status as "active" | "archived") ?? "active",
  }));

  const categories = await db
    .select({
      id: serviceCategories.id,
      name: serviceCategories.name,
      color: serviceCategories.color,
      sortOrder: serviceCategories.sortOrder,
    })
    .from(serviceCategories)
    .where(eq(serviceCategories.workspaceId, workspaceId))
    .orderBy(serviceCategories.sortOrder, serviceCategories.name);

  return (
    <div className="space-y-6">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">{t("Katalog Layanan", "Service Catalog")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Kelola daftar layanan murni yang dapat Anda tawarkan dan sertakan pada proposal bisnis.",
              "Manage your pure service catalog to include in client proposals.",
            )}
          </p>
        </div>
      </div>
      <ServiceCatalog services={catalogServices} categories={categories} />
    </div>
  );
}
