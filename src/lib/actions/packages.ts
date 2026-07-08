"use server";

import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const packageSchema = z.object({
  name: z.string().min(1),
  hours: z.number().int().positive().optional(),
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
});

export async function createPackage(projectId: string, data: z.infer<typeof packageSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = packageSchema.parse(data);

  const [pkg] = await db
    .insert(packages)
    .values({
      workspaceId,
      projectId,
      name: parsed.name,
      hours: parsed.hours ?? null,
      price: String(parsed.price),
      currency: parsed.currency,
      description: parsed.description ?? null,
      features: parsed.features ? JSON.stringify(parsed.features) : null,
      badge: parsed.badge ?? null,
      sortOrder: parsed.sortOrder,
      active: parsed.active,
      customPrice: parsed.customPrice != null ? String(parsed.customPrice) : null,
      minHours: parsed.minHours ?? null,
      maxHours: parsed.maxHours ?? null,
      allowCustom: parsed.allowCustom,
    })
    .returning();

  return pkg;
}

export async function updatePackage(packageId: string, data: Partial<z.infer<typeof packageSchema>>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = packageSchema.partial().parse(data);

  const updateData: Record<string, unknown> = {};
  if (parsed.name !== undefined) updateData.name = parsed.name;
  if (parsed.hours !== undefined) updateData.hours = parsed.hours ?? null;
  if (parsed.price !== undefined) updateData.price = String(parsed.price);
  if (parsed.currency !== undefined) updateData.currency = parsed.currency;
  if (parsed.description !== undefined) updateData.description = parsed.description ?? null;
  if (parsed.features !== undefined) updateData.features = parsed.features ? JSON.stringify(parsed.features) : null;
  if (parsed.badge !== undefined) updateData.badge = parsed.badge ?? null;
  if (parsed.sortOrder !== undefined) updateData.sortOrder = parsed.sortOrder;
  if (parsed.active !== undefined) updateData.active = parsed.active;
  if (parsed.customPrice !== undefined) updateData.customPrice = parsed.customPrice != null ? String(parsed.customPrice) : null;
  if (parsed.minHours !== undefined) updateData.minHours = parsed.minHours ?? null;
  if (parsed.maxHours !== undefined) updateData.maxHours = parsed.maxHours ?? null;
  if (parsed.allowCustom !== undefined) updateData.allowCustom = parsed.allowCustom;

  await db
    .update(packages)
    .set(updateData)
    .where(and(eq(packages.id, packageId), eq(packages.workspaceId, workspaceId)));
}

export async function deletePackage(packageId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await db
    .delete(packages)
    .where(and(eq(packages.id, packageId), eq(packages.workspaceId, workspaceId)));
}

export async function getPackagesByProject(projectId: string) {
  return db
    .select()
    .from(packages)
    .where(and(eq(packages.projectId, projectId), eq(packages.active, true)))
    .orderBy(packages.sortOrder);
}
