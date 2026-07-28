"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { projectServices, serviceCategories, services } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  assertProjectInWorkspace,
  assertWorkspaceMember,
  assertWorkspaceWritable,
  requireUser,
} from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { buildProjectServiceSnapshot, normalizeCatalogName } from "@/lib/service-snapshots";

const pricingModels = ["fixed", "hourly", "unit"] as const;

const serviceInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  defaultPricingModel: z.enum(pricingModels).default("fixed"),
  defaultUnit: z.string().trim().min(1).max(40).default("service"),
  defaultPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().min(1).default("IDR"),
  status: z.enum(["active", "archived"]).default("active"),
});
const serviceUpdateSchema = serviceInputSchema.partial();

const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z.string().trim().min(1).default("#64748b"),
  sortOrder: z.number().int().default(0),
});

const projectServiceSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().trim().min(1).optional(),
  unitPriceOverride: z.number().nonnegative().nullable().optional(),
  includedAllowance: z.number().nonnegative().nullable().optional(),
  sourcePackageAssignmentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().default(true),
});

async function actor() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  return { user, workspaceId };
}

function revalidateServiceSurfaces(projectId?: string) {
  revalidatePath("/app/services");
  revalidatePath("/app/projects");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

async function assertCategory(workspaceId: string, categoryId?: string | null) {
  if (!categoryId) return;
  const [category] = await db
    .select({ id: serviceCategories.id })
    .from(serviceCategories)
    .where(and(eq(serviceCategories.id, categoryId), eq(serviceCategories.workspaceId, workspaceId)))
    .limit(1);
  if (!category) throw new Error("Kategori service tidak berada di workspace aktif");
}

export async function getServiceCategories() {
  const { user, workspaceId } = await actor();
  await assertWorkspaceMember(db, user.id, workspaceId);
  return db
    .select()
    .from(serviceCategories)
    .where(eq(serviceCategories.workspaceId, workspaceId))
    .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
}

export async function createServiceCategory(input: z.input<typeof categoryInputSchema>) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = categoryInputSchema.parse(input);
  const [created] = await db
    .insert(serviceCategories)
    .values({
      workspaceId,
      name: parsed.name,
      normalizedName: normalizeCatalogName(parsed.name),
      color: parsed.color,
      sortOrder: parsed.sortOrder,
    })
    .returning();
  revalidateServiceSurfaces();
  return created;
}

export async function getWorkspaceServices(options?: { includeArchived?: boolean }) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceMember(db, user.id, workspaceId);
  return db
    .select({
      id: services.id,
      workspaceId: services.workspaceId,
      name: services.name,
      normalizedName: services.normalizedName,
      description: services.description,
      categoryId: services.categoryId,
      categoryName: serviceCategories.name,
      defaultPricingModel: services.defaultPricingModel,
      defaultUnit: services.defaultUnit,
      defaultPrice: services.defaultPrice,
      currency: services.currency,
      status: services.status,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
    })
    .from(services)
    .leftJoin(
      serviceCategories,
      and(
        eq(serviceCategories.id, services.categoryId),
        eq(serviceCategories.workspaceId, services.workspaceId),
      ),
    )
    .where(
      options?.includeArchived
        ? eq(services.workspaceId, workspaceId)
        : and(eq(services.workspaceId, workspaceId), eq(services.status, "active")),
    )
    .orderBy(asc(services.name));
}

export async function createService(input: z.input<typeof serviceInputSchema>) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = serviceInputSchema.parse(input);
  await assertCategory(workspaceId, parsed.categoryId);

  const [created] = await db
    .insert(services)
    .values({
      workspaceId,
      name: parsed.name,
      normalizedName: normalizeCatalogName(parsed.name),
      description: parsed.description || null,
      categoryId: parsed.categoryId || null,
      defaultPricingModel: parsed.defaultPricingModel,
      defaultUnit: parsed.defaultUnit,
      defaultPrice: parsed.defaultPrice == null ? null : String(parsed.defaultPrice),
      currency: parsed.currency,
      status: parsed.status,
      createdBy: user.id,
    })
    .returning();

  await writeActivityLog(workspaceId, user.id, "created_service", "service", created.id);
  revalidateServiceSurfaces();
  return created;
}

export async function updateService(serviceId: string, input: z.input<typeof serviceUpdateSchema>) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = serviceUpdateSchema.parse(input);
  await assertCategory(workspaceId, parsed.categoryId);

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.name !== undefined) {
    values.name = parsed.name;
    values.normalizedName = normalizeCatalogName(parsed.name);
  }
  if (parsed.description !== undefined) values.description = parsed.description || null;
  if (parsed.categoryId !== undefined) values.categoryId = parsed.categoryId || null;
  if (parsed.defaultPricingModel !== undefined) values.defaultPricingModel = parsed.defaultPricingModel;
  if (parsed.defaultUnit !== undefined) values.defaultUnit = parsed.defaultUnit;
  if (parsed.defaultPrice !== undefined) values.defaultPrice = parsed.defaultPrice == null ? null : String(parsed.defaultPrice);
  if (parsed.currency !== undefined) values.currency = parsed.currency;
  if (parsed.status !== undefined) values.status = parsed.status;

  const [updated] = await db
    .update(services)
    .set(values)
    .where(and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)))
    .returning();
  if (!updated) throw new Error("Service tidak ditemukan");

  await writeActivityLog(workspaceId, user.id, "updated_service", "service", serviceId);
  revalidateServiceSurfaces();
  return updated;
}

export async function archiveService(serviceId: string) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [archived] = await db
    .update(services)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)))
    .returning();
  if (!archived) throw new Error("Service tidak ditemukan");

  await writeActivityLog(workspaceId, user.id, "archived_service", "service", serviceId);
  revalidateServiceSurfaces();
  return archived;
}

export async function getProjectServices(projectId: string, options?: { includeArchived?: boolean }) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceMember(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);

  return db
    .select({
      id: projectServices.id,
      projectId: projectServices.projectId,
      serviceId: projectServices.serviceId,
      nameSnapshot: projectServices.nameSnapshot,
      descriptionSnapshot: projectServices.descriptionSnapshot,
      pricingModelSnapshot: projectServices.pricingModelSnapshot,
      sourcePackageAssignmentId: projectServices.sourcePackageAssignmentId,
      quantity: projectServices.quantity,
      unit: projectServices.unit,
      unitPrice: projectServices.unitPrice,
      currencySnapshot: projectServices.currencySnapshot,
      amount: projectServices.amount,
      includedAllowance: projectServices.includedAllowance,
      sortOrder: projectServices.sortOrder,
      status: projectServices.status,
      catalogStatus: services.status,
    })
    .from(projectServices)
    .leftJoin(
      services,
      and(eq(services.id, projectServices.serviceId), eq(services.workspaceId, projectServices.workspaceId)),
    )
    .where(
      options?.includeArchived
        ? and(eq(projectServices.projectId, projectId), eq(projectServices.workspaceId, workspaceId))
        : and(
            eq(projectServices.projectId, projectId),
            eq(projectServices.workspaceId, workspaceId),
            eq(projectServices.status, "active"),
          ),
    )
    .orderBy(asc(projectServices.sortOrder), asc(projectServices.nameSnapshot));
}

export async function setProjectServices(projectId: string, input: z.input<typeof projectServiceSchema>[]) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);
  const parsed = z.array(projectServiceSchema).max(500).parse(input);
  const activeRows = parsed.filter((row) => row.enabled);
  const serviceIds = activeRows.map((row) => row.serviceId);
  if (new Set(serviceIds).size !== serviceIds.length) throw new Error("Service Project duplikat");

  const catalogRows = serviceIds.length
    ? await db
        .select()
        .from(services)
        .where(and(eq(services.workspaceId, workspaceId), inArray(services.id, serviceIds)))
    : [];
  if (catalogRows.length !== serviceIds.length) throw new Error("Service lintas workspace ditolak");
  if (catalogRows.some((row) => row.status !== "active")) {
    throw new Error("Service archived tidak dapat diaktifkan pada Project");
  }

  const catalogById = new Map(catalogRows.map((row) => [row.id, row]));
  await db.transaction(async (tx) => {
    await tx
      .update(projectServices)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(projectServices.projectId, projectId), eq(projectServices.workspaceId, workspaceId)));

    for (const row of activeRows) {
      const service = catalogById.get(row.serviceId);
      if (!service) continue;
      const snapshot = buildProjectServiceSnapshot(service, row);
      await tx
        .insert(projectServices)
        .values({
          workspaceId,
          projectId,
          ...snapshot,
          sourcePackageAssignmentId: row.sourcePackageAssignmentId ?? null,
        })
        .onConflictDoUpdate({
          target: [projectServices.projectId, projectServices.serviceId],
          set: {
            ...snapshot,
            sourcePackageAssignmentId: row.sourcePackageAssignmentId ?? null,
            updatedAt: new Date(),
          },
        });
    }
  });

  await writeActivityLog(workspaceId, user.id, "updated_project_services", "project", projectId);
  revalidateServiceSurfaces(projectId);
  return getProjectServices(projectId, { includeArchived: true });
}

export async function syncProjectServiceSnapshots(projectId: string, serviceIds: string[]) {
  return setProjectServices(
    projectId,
    serviceIds.map((serviceId, sortOrder) => ({ serviceId, enabled: true, sortOrder })),
  );
}
