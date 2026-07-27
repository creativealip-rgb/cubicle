"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { customPackageRequests, packages, projects } from "@/db/schema";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { getClientPortalAccess } from "@/lib/actions/portal";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";

const createRequestSchema = z.object({
  credential: z.string().min(1).max(512),
  projectId: z.string().uuid(),
  hours: z.number().int().positive().max(100000),
  message: z.string().trim().max(2000).optional().nullable(),
  idempotencyKey: z.string().uuid(),
});

const updateStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

export async function createCustomPackageRequest(
  input: z.infer<typeof createRequestSchema>,
) {
  const parsed = createRequestSchema.parse(input);
  const client = await getClientPortalAccess(parsed.credential);
  await enforceServerActionRateLimit("portal:custom-package-request", client.id, {
    limit: 10,
    windowSec: 300,
  });

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(
      and(
        eq(projects.id, parsed.projectId),
        eq(projects.workspaceId, client.workspaceId),
        eq(projects.clientId, client.id),
        eq(projects.clientVisible, true),
        eq(projects.billingType, "package"),
      ),
    )
    .limit(1);
  if (!project) throw new Error("Project tidak tersedia");

  const projectPackages = await db
    .select()
    .from(packages)
    .where(
      and(
        eq(packages.projectId, project.id),
        eq(packages.workspaceId, project.workspaceId),
        eq(packages.active, true),
        eq(packages.allowCustom, true),
      ),
    )
    .orderBy(asc(packages.sortOrder));
  if (!projectPackages.length) throw new Error("Custom Package tidak tersedia");

  const min = Math.min(...projectPackages.map((pkg) => pkg.minHours ?? 1));
  const max = Math.max(...projectPackages.map((pkg) => pkg.maxHours ?? pkg.hours ?? min));
  if (parsed.hours < min || parsed.hours > max) {
    throw new Error(`Jam harus antara ${min} dan ${max}`);
  }

  const matched = projectPackages.find((pkg) => {
    const lower = pkg.minHours ?? 0;
    const upper = pkg.maxHours ?? Number.MAX_SAFE_INTEGER;
    return parsed.hours >= lower && parsed.hours <= upper;
  }) ?? projectPackages[0];
  const basePrice = Number(matched.customPrice ?? matched.price);
  const baseHours = matched.hours && matched.hours > 0 ? matched.hours : parsed.hours;
  const estimatedPrice = Math.round((basePrice / baseHours) * parsed.hours);

  const [created] = await db
    .insert(customPackageRequests)
    .values({
      workspaceId: project.workspaceId,
      clientId: client.id,
      projectId: project.id,
      clientPortalToken: null,
      idempotencyKey: parsed.idempotencyKey,
      requestedHours: parsed.hours,
      estimatedPrice: String(estimatedPrice),
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
    .from(customPackageRequests)
    .where(
      and(
        eq(customPackageRequests.clientId, client.id),
        eq(customPackageRequests.idempotencyKey, parsed.idempotencyKey),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Request gagal dibuat");
  return existing;
}

export async function getCustomPackageRequestsByToken(credential: string) {
  const client = await getClientPortalAccess(credential);
  return db
    .select()
    .from(customPackageRequests)
    .where(
      and(
        eq(customPackageRequests.workspaceId, client.workspaceId),
        eq(customPackageRequests.clientId, client.id),
      ),
    )
    .orderBy(customPackageRequests.createdAt);
}

export async function updateCustomPackageRequestStatus(
  requestId: string,
  status: "approved" | "rejected",
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = updateStatusSchema.parse({ requestId, status });

  const [updated] = await db
    .update(customPackageRequests)
    .set({ status: parsed.status })
    .where(
      and(
        eq(customPackageRequests.id, parsed.requestId),
        eq(customPackageRequests.workspaceId, workspaceId),
        eq(customPackageRequests.status, "pending"),
      ),
    )
    .returning();
  if (!updated) throw new Error("Request tidak ditemukan atau sudah diproses");
  return updated;
}
