"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { personalNotes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertWorkspaceMember, requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

const noteSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().max(20000).optional(),
  pinned: z.boolean().optional(),
});

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceMember(db, user.id, workspaceId);
  return { user, workspaceId };
}

export async function listPersonalNotes() {
  const { user, workspaceId } = await getContext();
  return db
    .select()
    .from(personalNotes)
    .where(and(eq(personalNotes.workspaceId, workspaceId), eq(personalNotes.userId, user.id)))
    .orderBy(desc(personalNotes.pinned), desc(personalNotes.updatedAt))
    .limit(100);
}

export async function createPersonalNote(input: z.infer<typeof noteSchema>) {
  const { user, workspaceId } = await getContext();
  const parsed = noteSchema.parse(input);
  const [note] = await db
    .insert(personalNotes)
    .values({
      workspaceId,
      userId: user.id,
      title: parsed.title,
      body: parsed.body || null,
      pinned: parsed.pinned ?? false,
    })
    .returning();
  revalidatePath("/app/personal");
  return note;
}

export async function updatePersonalNoteStatus(noteId: string, status: "open" | "done" | "archived") {
  const { user, workspaceId } = await getContext();
  const [note] = await db
    .update(personalNotes)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(personalNotes.id, noteId), eq(personalNotes.workspaceId, workspaceId), eq(personalNotes.userId, user.id)))
    .returning();
  if (!note) throw new Error("Note not found");
  revalidatePath("/app/personal");
  return note;
}

export async function togglePersonalNotePinned(noteId: string, pinned: boolean) {
  const { user, workspaceId } = await getContext();
  const [note] = await db
    .update(personalNotes)
    .set({ pinned, updatedAt: new Date() })
    .where(and(eq(personalNotes.id, noteId), eq(personalNotes.workspaceId, workspaceId), eq(personalNotes.userId, user.id)))
    .returning();
  if (!note) throw new Error("Note not found");
  revalidatePath("/app/personal");
  return note;
}

export async function deletePersonalNote(noteId: string) {
  const { user, workspaceId } = await getContext();
  const [note] = await db
    .delete(personalNotes)
    .where(and(eq(personalNotes.id, noteId), eq(personalNotes.workspaceId, workspaceId), eq(personalNotes.userId, user.id)))
    .returning({ id: personalNotes.id });
  if (!note) throw new Error("Note not found");
  revalidatePath("/app/personal");
  return { success: true };
}
