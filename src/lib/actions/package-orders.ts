"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { packageOrders, packages, projects } from "@/db/schema";
import { getClientPortalAccess } from "@/lib/actions/portal";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";

const createPackageOrderSchema = z.object({
  credential: z.string().min(1).max(512),
  projectId: z.string().uuid(),
  packageId: z.string().uuid(),
  message: z.string().trim().max(2000).optional().nullable(),
  idempotencyKey: z.string().uuid(),
});

/** Portal order. Commercial values always come from authoritative DB rows. */
export async function createPackageOrder(
  input: z.infer<typeof createPackageOrderSchema>,
) {
  const parsed = createPackageOrderSchema.parse(input);
  const client = await getClientPortalAccess(parsed.credential);
  await enforceServerActionRateLimit("portal:package-order", client.id, {
    limit: 10,
    windowSec: 300,
  });

  const [resource] = await db
    .select({
      projectId: projects.id,
      workspaceId: projects.workspaceId,
      clientId: projects.clientId,
      clientVisible: projects.clientVisible,
      billingType: projects.billingType,
      packageId: packages.id,
      packageProjectId: packages.projectId,
      packageName: packages.name,
      hours: packages.hours,
      price: packages.price,
      customPrice: packages.customPrice,
      currency: packages.currency,
      active: packages.active,
    })
    .from(projects)
    .innerJoin(
      packages,
      and(
        eq(packages.id, parsed.packageId),
        eq(packages.workspaceId, projects.workspaceId),
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
  if (!resource.active) throw new Error("Package sudah tidak aktif");
  if (resource.billingType !== "package") {
    throw new Error("Project tidak memakai billing Package");
  }
  if (resource.packageProjectId !== resource.projectId) {
    throw new Error("Package tidak tersedia untuk Project ini");
  }

  const authoritativePrice = resource.customPrice ?? resource.price;
  const [created] = await db
    .insert(packageOrders)
    .values({
      workspaceId: resource.workspaceId,
      clientId: client.id,
      projectId: resource.projectId,
      packageId: resource.packageId,
      clientPortalToken: null,
      idempotencyKey: parsed.idempotencyKey,
      packageName: resource.packageName,
      hours: resource.hours,
      price: authoritativePrice,
      currency: resource.currency,
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
