import { db } from "@/db";
import { services, serviceCategories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { ServiceCatalog, type CatalogService, type ServicePricingModel } from "@/components/services/service-catalog";

export default async function ServicesPage() {
  const workspaceId = await getWorkspaceForCurrentUser();

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
      <ServiceCatalog services={catalogServices} categories={categories} />
    </div>
  );
}
