"use server";

import { db } from "@/db";
import { packageOrders, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createPackageOrder(
  token: string,
  projectId: string,
  packageId: string,
  packageName: string,
  hours: number | null,
  price: string,
  currency: string,
  message?: string,
) {
  // Get workspace from project
  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");

  await db.insert(packageOrders).values({
    workspaceId: project.workspaceId,
    projectId,
    packageId,
    clientPortalToken: token,
    packageName,
    hours,
    price,
    currency,
    message,
  });
}

export async function getPackageOrdersByToken(token: string) {
  return db
    .select()
    .from(packageOrders)
    .where(eq(packageOrders.clientPortalToken, token))
    .orderBy(packageOrders.createdAt);
}
