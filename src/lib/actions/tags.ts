"use server";

import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timerTags } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";

export async function getTimerTags() {
  const workspaceId = await getWorkspaceForCurrentUser();
  return db
    .select()
    .from(timerTags)
    .where(eq(timerTags.workspaceId, workspaceId))
    .orderBy(asc(timerTags.name));
}

export async function createTimerTag({ name, color }: { name: string; color?: string }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const cleanName = name.trim();
  if (!cleanName) throw new Error("Nama tag tidak boleh kosong");

  const [existing] = await db
    .select()
    .from(timerTags)
    .where(and(eq(timerTags.workspaceId, workspaceId), eq(timerTags.name, cleanName)))
    .limit(1);

  if (existing) throw new Error("Tag dengan nama ini sudah ada");

  const [created] = await db
    .insert(timerTags)
    .values({
      workspaceId,
      name: cleanName,
      color: color?.trim() || null,
    })
    .returning();

  return created;
}

export async function deleteTimerTag(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  await db
    .delete(timerTags)
    .where(and(eq(timerTags.id, id), eq(timerTags.workspaceId, workspaceId)));

  return { success: true };
}
