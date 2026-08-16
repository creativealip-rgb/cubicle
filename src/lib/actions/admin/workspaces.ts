"use server";

import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users as usersTable, workspaceMembers, workspaces } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { listWorkspacesSchema } from "@/lib/admin-schemas";

const PAGE_SIZE = 25;

export async function listWorkspaces(input: z.infer<typeof listWorkspacesSchema>) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:list-workspaces", admin.id, { limit: 120, windowSec: 60 });
  const parsed = listWorkspacesSchema.parse(input);

  const where = parsed.search
    ? sql`(${workspaces.name} ILIKE ${`%${parsed.search}%`} OR ${workspaces.slug} ILIKE ${`%${parsed.search}%`})`
    : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(workspaces)
    .where(where);

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      ownerId: workspaces.ownerId,
      ownerName: usersTable.name,
      ownerEmail: usersTable.email,
      memberCount: sql<number>`(
        SELECT count(*)::int FROM workspace_members wm WHERE wm.workspace_id = ${workspaces.id}
      )`,
      createdAt: workspaces.createdAt,
    })
    .from(workspaces)
    .leftJoin(usersTable, eq(usersTable.id, workspaces.ownerId))
    .where(where)
    .orderBy(desc(workspaces.createdAt))
    .limit(PAGE_SIZE)
    .offset((parsed.page - 1) * PAGE_SIZE);

  return {
    workspaces: rows,
    total,
    page: parsed.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getWorkspaceDetail(workspaceId: string) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:workspace-detail", admin.id, { limit: 120, windowSec: 60 });

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) return null;

  const [owner, members] = await Promise.all([
    db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, emailVerified: usersTable.emailVerified })
      .from(usersTable)
      .where(eq(usersTable.id, workspace.ownerId))
      .limit(1),
    db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        name: usersTable.name,
        email: usersTable.email,
        createdAt: workspaceMembers.createdAt,
      })
      .from(workspaceMembers)
      .leftJoin(usersTable, eq(usersTable.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(workspaceMembers.role),
  ]);

  return { workspace, owner: owner ?? null, members };
}
