"use server";

import { db } from "@/db";
import { customPackageRequests, packages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function createCustomPackageRequest(
  token: string,
  projectId: string,
  hours: number,
  message?: string,
) {
  // Find matching package to estimate price
  const pkgs = await db
    .select()
    .from(packages)
    .where(and(eq(packages.projectId, projectId), eq(packages.active, true), eq(packages.allowCustom, true)));

  let estimatedPrice: number | null = null;

  if (pkgs.length > 0) {
    // Find best matching package: prefer one whose hours range covers requested hours,
    // otherwise use the one with lowest hours >= requested, or fallback to first
    const matching = pkgs.find(
      (p) =>
        p.hours != null &&
        (p.minHours == null || hours >= p.minHours) &&
        (p.maxHours == null || hours <= p.maxHours),
    );

    if (matching) {
      const basePrice = Number(matching.customPrice ?? matching.price);
      const baseHours = matching.hours ?? 1;
      estimatedPrice = Math.round((basePrice / baseHours) * hours);
    } else {
      // Fallback: use first package's rate
      const fallback = pkgs[0];
      const basePrice = Number(fallback.customPrice ?? fallback.price);
      const baseHours = fallback.hours ?? 1;
      estimatedPrice = Math.round((basePrice / baseHours) * hours);
    }
  }

  // Get workspaceId from first package (all share same workspace)
  const workspaceId = pkgs[0]?.workspaceId ?? null;
  if (!workspaceId) {
    throw new Error("No packages found for this project");
  }

  const [request] = await db
    .insert(customPackageRequests)
    .values({
      workspaceId,
      projectId,
      clientPortalToken: token,
      requestedHours: hours,
      estimatedPrice: estimatedPrice != null ? String(estimatedPrice) : null,
      message: message || null,
      status: "pending",
    })
    .returning();

  return request;
}

export async function getCustomPackageRequests(workspaceId: string) {
  return db
    .select()
    .from(customPackageRequests)
    .where(eq(customPackageRequests.workspaceId, workspaceId))
    .orderBy(customPackageRequests.createdAt);
}

export async function getCustomPackageRequestsByToken(token: string) {
  return db
    .select()
    .from(customPackageRequests)
    .where(eq(customPackageRequests.clientPortalToken, token))
    .orderBy(customPackageRequests.createdAt);
}

export async function updateCustomPackageRequestStatus(
  requestId: string,
  status: "approved" | "rejected",
) {
  await db
    .update(customPackageRequests)
    .set({ status })
    .where(eq(customPackageRequests.id, requestId));
}
