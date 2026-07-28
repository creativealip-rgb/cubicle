"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { packageItems, packageOrders, projectPackageAssignments, projects, services } from "@/db/schema";
import { getClientPortalAccess } from "@/lib/actions/portal";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";

const createPackageOrderSchema = z.object({
  credential: z.string().min(1).max(512),
  projectId: z.string().uuid(),
  packageId: z.string().uuid(),
  message: z.string().trim().max(2000).optional().nullable(),
  idempotencyKey: z.string().uuid(),
});

export async function getPackageItemsForOrders(projectPackageAssignmentIds: string[]) {
  const ids = [...new Set(projectPackageAssignmentIds.filter(Boolean))];
  if (ids.length === 0) return [];
  return db
    .select({
      id: packageItems.id,
      projectPackageAssignmentId: projectPackageAssignments.id,
      packageId: packageItems.packageId,
      serviceId: packageItems.serviceId,
      serviceName: services.name,
      quantity: packageItems.quantity,
      unit: packageItems.unit,
      includedAllowance: packageItems.includedAllowance,
      sortOrder: packageItems.sortOrder,
    })
    .from(projectPackageAssignments)
    .innerJoin(packageItems, and(
      eq(packageItems.packageId, projectPackageAssignments.sourcePackageId),
      eq(packageItems.workspaceId, projectPackageAssignments.workspaceId),
      eq(packageItems.status, "active"),
    ))
    .innerJoin(services, and(eq(services.id, packageItems.serviceId), eq(services.workspaceId, packageItems.workspaceId)))
    .where(inArray(projectPackageAssignments.id, ids))
    .orderBy(asc(packageItems.sortOrder), asc(services.name));
}

async function resolveProjectPackageForPortalOrder(client: { id: string; workspaceId: string }, parsed: z.infer<typeof createPackageOrderSchema>) {
  const [resource] = await db
    .select({
      projectId: projects.id,
      workspaceId: projects.workspaceId,
      clientId: projects.clientId,
      clientVisible: projects.clientVisible,
      billingType: projects.billingType,
      assignmentId: projectPackageAssignments.id,
      packageId: projectPackageAssignments.sourcePackageId,
      packageNameSnapshot: projectPackageAssignments.nameSnapshot,
      priceSnapshot: projectPackageAssignments.priceSnapshot,
      currencySnapshot: projectPackageAssignments.currencySnapshot,
      allowanceValueSnapshot: projectPackageAssignments.allowanceValueSnapshot,
    })
    .from(projects)
    .innerJoin(
      projectPackageAssignments,
      and(
        eq(projectPackageAssignments.projectId, projects.id),
        eq(projectPackageAssignments.workspaceId, client.workspaceId),
        eq(projectPackageAssignments.status, "active"),
        eq(projectPackageAssignments.sourcePackageId, parsed.packageId),
      ),
    )
    .where(
      and(
        eq(projects.id, parsed.projectId),
        eq(projects.workspaceId, client.workspaceId),
        eq(projects.clientId, client.id),
        eq(projects.clientVisible, true),
      ),
    )
    .limit(1);

  if (!resource) throw new Error("Project atau Package tidak tersedia");
  if (resource.billingType !== "package") throw new Error("Project tidak memakai billing Package");
  return resource;
}

/** Portal order. Commercial values always come from authoritative DB snapshots. */
export async function createPackageOrder(
  input: z.infer<typeof createPackageOrderSchema>,
) {
  const parsed = createPackageOrderSchema.parse(input);
  const client = await getClientPortalAccess(parsed.credential);
  await enforceServerActionRateLimit("portal:package-order", client.id, {
    limit: 10,
    windowSec: 300,
  });

  const resource = await resolveProjectPackageForPortalOrder(client, parsed);
  const hours = resource.allowanceValueSnapshot == null
    ? null
    : Math.trunc(Number(resource.allowanceValueSnapshot));

  const [created] = await db
    .insert(packageOrders)
    .values({
      workspaceId: resource.workspaceId,
      clientId: client.id,
      projectId: resource.projectId,
      packageId: resource.packageId,
      projectPackageAssignmentId: resource.assignmentId,
      clientPortalToken: null,
      idempotencyKey: parsed.idempotencyKey,
      packageName: resource.packageNameSnapshot,
      hours,
      price: resource.priceSnapshot,
      currency: resource.currencySnapshot,
      message: parsed.message || null,
      status: "pending",
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    revalidatePath(`/client-portal/${parsed.credential}`);
    return created;
  }

  const [existing] = await db
    .select()
    .from(packageOrders)
    .where(
      and(
        eq(packageOrders.clientId, client.id),
        eq(packageOrders.idempotencyKey, parsed.idempotencyKey),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Order gagal dibuat");
  return existing;
}

export async function getPackageOrdersByToken(credential: string) {
  const client = await getClientPortalAccess(credential);
  return db
    .select()
    .from(packageOrders)
    .where(
      and(
        eq(packageOrders.workspaceId, client.workspaceId),
        eq(packageOrders.clientId, client.id),
      ),
    )
    .orderBy(packageOrders.createdAt);
}
