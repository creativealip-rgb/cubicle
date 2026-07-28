"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  packageItems,
  packages,
  projectPackageAssignments,
  projects,
  projectServices,
  services,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  assertProjectInWorkspace,
  assertWorkspaceWritable,
  requireUser,
} from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import {
  buildProjectPackageSnapshot,
  buildProjectServiceSnapshotsFromPackage,
} from "@/lib/package-snapshots";

async function actor() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  return { user, workspaceId };
}

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const packageItemSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().trim().min(1).max(40).optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().min(1).default("IDR"),
  includedAllowance: z.number().nonnegative().nullable().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(["active", "archived"]).default("active"),
});

const packageSchema = z.object({
  name: z.string().trim().min(1),
  hours: z.number().int().positive().optional(),
  allowanceValue: z.number().nonnegative().optional(),
  allowanceType: z.literal("hours").default("hours"),
  lifecycleClass: z.enum(["one_off", "legacy_recurring_unmodeled"]).default("one_off"),
  status: z.enum(["active", "archived"]).default("active"),
  price: z.number().positive(),
  currency: z.string().default("IDR"),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  badge: z.string().optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
  customPrice: z.number().positive().optional(),
  minHours: z.number().int().positive().optional(),
  maxHours: z.number().int().positive().optional(),
  allowCustom: z.boolean().default(false),
  packageItems: z.array(packageItemSchema).optional(),
});

function revalidatePackageSurfaces(projectId?: string) {
  revalidatePath("/app/packages");
  revalidatePath("/app/projects");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

function packageValues(workspaceId: string, parsed: z.infer<typeof packageSchema>, projectId: string | null) {
  const allowanceValue = parsed.allowanceValue ?? parsed.hours ?? null;
  const active = parsed.status === "active" && parsed.active;
  return {
    workspaceId,
    projectId,
    name: parsed.name,
    hours: parsed.hours ?? (allowanceValue != null ? Math.trunc(allowanceValue) : null),
    allowanceType: parsed.allowanceType,
    allowanceValue: allowanceValue == null ? null : String(allowanceValue),
    lifecycleClass: parsed.lifecycleClass,
    status: parsed.status,
    price: String(parsed.price),
    currency: parsed.currency,
    description: parsed.description ?? null,
    features: parsed.features ? JSON.stringify(parsed.features) : null,
    badge: parsed.badge ?? null,
    sortOrder: parsed.sortOrder,
    active,
    customPrice: parsed.customPrice != null ? String(parsed.customPrice) : null,
    minHours: parsed.minHours ?? null,
    maxHours: parsed.maxHours ?? null,
    allowCustom: parsed.allowCustom,
    updatedAt: new Date(),
  };
}

export async function assertPackageInWorkspace(packageId: string, workspaceId: string) {
  const [pkg] = await db
    .select()
    .from(packages)
    .where(and(eq(packages.id, packageId), eq(packages.workspaceId, workspaceId)))
    .limit(1);
  if (!pkg) throw new Error("Paket tidak ditemukan");
  return pkg;
}

async function assertPackageItemsInWorkspace(workspaceId: string, rows: z.infer<typeof packageItemSchema>[]) {
  const serviceIds = rows.filter((row) => row.status === "active").map((row) => row.serviceId);
  if (new Set(serviceIds).size !== serviceIds.length) throw new Error("Service paket duplikat");
  if (serviceIds.length === 0) return [];
  const serviceRows = await db
    .select()
    .from(services)
    .where(and(eq(services.workspaceId, workspaceId), inArray(services.id, serviceIds)));
  if (serviceRows.length !== serviceIds.length) throw new Error("Service lintas workspace ditolak");
  if (serviceRows.some((row) => row.status !== "active")) throw new Error("Service archived tidak dapat masuk Paket");
  return serviceRows;
}

export async function upsertPackageItems(packageId: string, input: z.infer<typeof packageItemSchema>[]) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertPackageInWorkspace(packageId, workspaceId);
  const parsed = z.array(packageItemSchema).max(100).parse(input);
  await assertPackageItemsInWorkspace(workspaceId, parsed);

  await db.transaction(async (tx) => {
    await tx
      .update(packageItems)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(packageItems.workspaceId, workspaceId), eq(packageItems.packageId, packageId)));

    for (const [index, item] of parsed.entries()) {
      if (item.status !== "active") continue;
      await tx
        .insert(packageItems)
        .values({
          workspaceId,
          packageId,
          serviceId: item.serviceId,
          quantity: String(item.quantity ?? 1),
          unit: item.unit || "service",
          unitPrice: item.unitPrice == null ? null : String(item.unitPrice),
          currency: item.currency || "IDR",
          includedAllowance: item.includedAllowance == null ? null : String(item.includedAllowance),
          sortOrder: item.sortOrder ?? index,
          status: "active",
        })
        .onConflictDoUpdate({
          target: [packageItems.packageId, packageItems.serviceId],
          set: {
            quantity: String(item.quantity ?? 1),
            unit: item.unit || "service",
            unitPrice: item.unitPrice == null ? null : String(item.unitPrice),
            currency: item.currency || "IDR",
            includedAllowance: item.includedAllowance == null ? null : String(item.includedAllowance),
            sortOrder: item.sortOrder ?? index,
            status: "active",
            updatedAt: new Date(),
          },
        });
    }
  });

  revalidatePackageSurfaces();
  return getPackageItemsByPackageIds([packageId]);
}

export async function getPackageItemsByPackageIds(packageIds: string[]) {
  const workspaceId = await getWorkspaceId();
  const ids = [...new Set(packageIds.filter(Boolean))];
  if (ids.length === 0) return [];
  return db
    .select({
      id: packageItems.id,
      workspaceId: packageItems.workspaceId,
      packageId: packageItems.packageId,
      serviceId: packageItems.serviceId,
      quantity: packageItems.quantity,
      unit: packageItems.unit,
      unitPrice: packageItems.unitPrice,
      currency: packageItems.currency,
      includedAllowance: packageItems.includedAllowance,
      sortOrder: packageItems.sortOrder,
      status: packageItems.status,
      serviceName: services.name,
      serviceDescription: services.description,
      servicePricingModel: services.defaultPricingModel,
      serviceDefaultUnit: services.defaultUnit,
      serviceDefaultPrice: services.defaultPrice,
      serviceCurrency: services.currency,
    })
    .from(packageItems)
    .innerJoin(services, and(eq(services.id, packageItems.serviceId), eq(services.workspaceId, packageItems.workspaceId)))
    .where(and(eq(packageItems.workspaceId, workspaceId), inArray(packageItems.packageId, ids)))
    .orderBy(asc(packageItems.sortOrder), asc(services.name));
}

export async function getWorkspacePackageBuilderData() {
  const [packageRows, serviceRows] = await Promise.all([
    getWorkspacePackages({ includeArchived: true }),
    db
      .select({
        id: services.id,
        name: services.name,
        defaultPricingModel: services.defaultPricingModel,
        defaultUnit: services.defaultUnit,
        defaultPrice: services.defaultPrice,
        currency: services.currency,
        status: services.status,
      })
      .from(services)
      .where(eq(services.workspaceId, await getWorkspaceId()))
      .orderBy(asc(services.name)),
  ]);
  const itemRows = await getPackageItemsByPackageIds(packageRows.map((pkg) => pkg.id));
  return {
    packages: packageRows.map((pkg) => ({
      ...pkg,
      includedServices: itemRows.filter((item) => item.packageId === pkg.id && item.status === "active"),
    })),
    services: serviceRows,
  };
}

export async function createPackage(projectId: string, data: z.infer<typeof packageSchema>) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);
  const parsed = packageSchema.parse(data);
  await assertPackageItemsInWorkspace(workspaceId, parsed.packageItems ?? []);

  const [pkg] = await db
    .insert(packages)
    .values(packageValues(workspaceId, parsed, projectId))
    .returning();
  if (parsed.packageItems) await upsertPackageItems(pkg.id, parsed.packageItems);
  return pkg;
}

export async function updatePackage(packageId: string, data: Partial<z.infer<typeof packageSchema>>) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertPackageInWorkspace(packageId, workspaceId);
  const parsed = packageSchema.partial().parse(data);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.name !== undefined) updateData.name = parsed.name;
  if (parsed.hours !== undefined) updateData.hours = parsed.hours ?? null;
  if (parsed.allowanceValue !== undefined) updateData.allowanceValue = parsed.allowanceValue == null ? null : String(parsed.allowanceValue);
  if (parsed.allowanceType !== undefined) updateData.allowanceType = parsed.allowanceType;
  if (parsed.lifecycleClass !== undefined) updateData.lifecycleClass = parsed.lifecycleClass;
  if (parsed.status !== undefined) {
    updateData.status = parsed.status;
    updateData.active = parsed.status === "active";
  }
  if (parsed.price !== undefined) updateData.price = String(parsed.price);
  if (parsed.currency !== undefined) updateData.currency = parsed.currency;
  if (parsed.description !== undefined) updateData.description = parsed.description ?? null;
  if (parsed.features !== undefined) updateData.features = parsed.features ? JSON.stringify(parsed.features) : null;
  if (parsed.badge !== undefined) updateData.badge = parsed.badge ?? null;
  if (parsed.sortOrder !== undefined) updateData.sortOrder = parsed.sortOrder;
  if (parsed.active !== undefined) {
    updateData.active = parsed.active;
    updateData.status = parsed.active ? "active" : "archived";
  }
  if (parsed.customPrice !== undefined) updateData.customPrice = parsed.customPrice != null ? String(parsed.customPrice) : null;
  if (parsed.minHours !== undefined) updateData.minHours = parsed.minHours ?? null;
  if (parsed.maxHours !== undefined) updateData.maxHours = parsed.maxHours ?? null;
  if (parsed.allowCustom !== undefined) updateData.allowCustom = parsed.allowCustom;

  await db
    .update(packages)
    .set(updateData)
    .where(and(eq(packages.id, packageId), eq(packages.workspaceId, workspaceId)));

  if (parsed.packageItems) await upsertPackageItems(packageId, parsed.packageItems);
  revalidatePackageSurfaces();
}

export async function deletePackage(packageId: string) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const [archived] = await db
    .update(packages)
    .set({ active: false, status: "archived", updatedAt: new Date() })
    .where(and(eq(packages.id, packageId), eq(packages.workspaceId, workspaceId)))
    .returning({ id: packages.id });
  if (!archived) throw new Error("Package not found");
  revalidatePackageSurfaces();
  return { success: true as const, archived: true as const };
}

export async function getPackagesByProject(projectId: string) {
  return db
    .select()
    .from(packages)
    .where(and(eq(packages.projectId, projectId), eq(packages.active, true)))
    .orderBy(packages.sortOrder);
}

export async function getWorkspacePackages(options?: { includeArchived?: boolean }) {
  const workspaceId = await getWorkspaceId();
  return db
    .select()
    .from(packages)
    .where(
      options?.includeArchived
        ? and(eq(packages.workspaceId, workspaceId), isNull(packages.projectId))
        : and(eq(packages.workspaceId, workspaceId), isNull(packages.projectId), eq(packages.status, "active")),
    )
    .orderBy(packages.sortOrder);
}

export async function createWorkspacePackage(data: z.infer<typeof packageSchema>) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = packageSchema.parse(data);
  await assertPackageItemsInWorkspace(workspaceId, parsed.packageItems ?? []);

  const [pkg] = await db
    .insert(packages)
    .values(packageValues(workspaceId, parsed, null))
    .returning();
  if (parsed.packageItems) await upsertPackageItems(pkg.id, parsed.packageItems);
  return pkg;
}

async function getPackageItemsForAssignment(workspaceId: string, packageId: string) {
  return db
    .select({
      id: packageItems.id,
      serviceId: packageItems.serviceId,
      quantity: packageItems.quantity,
      unit: packageItems.unit,
      unitPrice: packageItems.unitPrice,
      currency: packageItems.currency,
      includedAllowance: packageItems.includedAllowance,
      sortOrder: packageItems.sortOrder,
      service: services,
    })
    .from(packageItems)
    .innerJoin(services, and(eq(services.id, packageItems.serviceId), eq(services.workspaceId, packageItems.workspaceId)))
    .where(
      and(
        eq(packageItems.workspaceId, workspaceId),
        eq(packageItems.packageId, packageId),
        eq(packageItems.status, "active"),
      ),
    )
    .orderBy(asc(packageItems.sortOrder), asc(services.name));
}

export async function syncProjectPackageAssignment(projectId: string, packageId: string | null) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);

  const assignment = await db.transaction(async (tx) => {
    await tx
      .update(projectPackageAssignments)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(projectPackageAssignments.workspaceId, workspaceId), eq(projectPackageAssignments.projectId, projectId), eq(projectPackageAssignments.status, "active")));

    await tx
      .update(projectServices)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(projectServices.workspaceId, workspaceId), eq(projectServices.projectId, projectId), eq(projectServices.sourcePackageAssignmentId, projectServices.sourcePackageAssignmentId)));

    if (!packageId) return null;

    const [pkg] = await tx
      .select()
      .from(packages)
      .where(and(eq(packages.id, packageId), eq(packages.workspaceId, workspaceId)))
      .limit(1);
    if (!pkg || pkg.status !== "active") throw new Error("Paket tidak ditemukan atau archived");

    const [createdAssignment] = await tx
      .insert(projectPackageAssignments)
      .values({
        workspaceId,
        projectId,
        ...buildProjectPackageSnapshot(pkg),
      })
      .returning();

    const items = await getPackageItemsForAssignment(workspaceId, packageId);
    const snapshots = buildProjectServiceSnapshotsFromPackage(items, createdAssignment.id);
    for (const snapshot of snapshots) {
      await tx
        .insert(projectServices)
        .values({
          workspaceId,
          projectId,
          ...snapshot,
        })
        .onConflictDoUpdate({
          target: [projectServices.projectId, projectServices.serviceId],
          set: {
            ...snapshot,
            updatedAt: new Date(),
          },
        });
    }

    return createdAssignment;
  });

  if (assignment && packageId) {
    await writeActivityLog(workspaceId, user.id, "assigned_project_package", "project", projectId, {
      packageId,
      projectPackageAssignmentId: assignment.id,
    });
  }
  return assignment;
}

export async function assignPackageToProject(projectId: string, packageId: string | null) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);
  if (packageId) await assertPackageInWorkspace(packageId, workspaceId);

  await db
    .update(projects)
    .set({ selectedPackageId: packageId, billingType: "package", updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)));

  const assignment = await syncProjectPackageAssignment(projectId, packageId);
  revalidatePackageSurfaces(projectId);
  return assignment;
}
