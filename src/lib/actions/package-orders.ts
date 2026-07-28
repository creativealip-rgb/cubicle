"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { packageItems, packageOrders, projectPackageAssignments, projects, services } from "@/db/schema";
import { getClientPortalAccess } from "@/lib/actions/portal";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { auth } from "@/lib/auth";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

const createPackageOrderSchema = z.object({
  credential: z.string().min(1).max(512),
  projectId: z.string().uuid(),
  packageId: z.string().uuid(),
  message: z.string().trim().max(2000).optional().nullable(),
  idempotencyKey: z.string().uuid(),
});

const transitionPackageOrderSchema = z.object({
  orderId: z.string().uuid(),
  decision: z.enum(["confirm", "cancel"]),
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

export async function getWorkspacePackageOrders() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  return db
    .select()
    .from(packageOrders)
    .where(eq(packageOrders.workspaceId, workspaceId))
    .orderBy(packageOrders.createdAt);
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

/** Admin-only terminal transition. Commercial snapshots remain immutable. */
export async function transitionPackageOrder(input: z.infer<typeof transitionPackageOrderSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = transitionPackageOrderSchema.parse(input);

  const order = await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`
      SELECT id FROM package_orders
      WHERE id = ${parsed.orderId} AND workspace_id = ${workspaceId}
      FOR UPDATE
    `);
    if (locked.rowCount === 0) throw new Error("Order tidak ditemukan");

    const [current] = await tx
      .select()
      .from(packageOrders)
      .where(and(
        eq(packageOrders.id, parsed.orderId),
        eq(packageOrders.workspaceId, workspaceId),
      ))
      .limit(1);
    if (!current) throw new Error("Order tidak ditemukan");
    if (current.status !== "pending") throw new Error("Order sudah diproses");

    const [updated] = await tx
      .update(packageOrders)
      .set({ status: parsed.decision === "confirm" ? "confirmed" : "cancelled" })
      .where(and(
        eq(packageOrders.id, parsed.orderId),
        eq(packageOrders.workspaceId, workspaceId),
        eq(packageOrders.status, "pending"),
      ))
      .returning();
    if (!updated) throw new Error("Order sudah diproses");
    return updated;
  });

  revalidatePath("/app/packages");
  revalidatePath(`/app/projects/${order.projectId}`);
  revalidatePath("/client-portal/[token]", "page");
  return order;
}
