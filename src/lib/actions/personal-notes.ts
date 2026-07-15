"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { personalNotes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertWorkspaceOwner, requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

const RECURRENCE = ["none", "daily", "weekly", "monthly", "yearly"] as const;
const STATUS = ["open", "done", "archived"] as const;

const noteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(20000).optional(),
  dueDate: z.string().optional(),
  recurrenceRule: z.enum(RECURRENCE).optional().default("none"),
  notify7d: z.boolean().optional().default(false),
  notify3d: z.boolean().optional().default(false),
  notify1d: z.boolean().optional().default(false),
  pinned: z.boolean().optional().default(false),
});

export type PersonalNoteStatus = (typeof STATUS)[number];
export type PersonalNoteRecurrence = (typeof RECURRENCE)[number];

function parseDueDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid due date");
  return date;
}

function normalizeRecurrence(value?: string): PersonalNoteRecurrence {
  const v = (value || "none").toLowerCase().trim();
  return (RECURRENCE as readonly string[]).includes(v)
    ? (v as PersonalNoteRecurrence)
    : "none";
}

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceOwner(db, user.id, workspaceId);
  return { user, workspaceId };
}

async function requireOwnedNote(noteId: string) {
  const { user, workspaceId } = await getContext();
  const [note] = await db
    .select()
    .from(personalNotes)
    .where(
      and(
        eq(personalNotes.id, noteId),
        eq(personalNotes.workspaceId, workspaceId),
        eq(personalNotes.userId, user.id),
      ),
    )
    .limit(1);
  if (!note) throw new Error("Note not found");
  return { user, workspaceId, note };
}

export async function listPersonalNotes(
  query?: string,
  opts?: {
    status?: PersonalNoteStatus | "all" | "active";
    includeSystem?: boolean;
    titlePrefix?: string;
    limit?: number;
  },
) {
  const { user, workspaceId } = await getContext();
  const conditions: SQL[] = [
    eq(personalNotes.workspaceId, workspaceId),
    eq(personalNotes.userId, user.id),
  ];

  if (!opts?.includeSystem) {
    conditions.push(sql`${personalNotes.title} NOT LIKE ${"[journal]%"}`);
    conditions.push(sql`${personalNotes.title} NOT LIKE ${"[site]%"}`);
  }

  if (opts?.titlePrefix) {
    conditions.push(sql`${personalNotes.title} LIKE ${`${opts.titlePrefix}%`}`);
  }

  if (opts?.status === "active") {
    conditions.push(ne(personalNotes.status, "archived"));
  } else if (opts?.status && opts.status !== "all") {
    conditions.push(eq(personalNotes.status, opts.status));
  }

  if (query?.trim()) {
    const q = `%${query.trim()}%`;
    conditions.push(
      or(sql`${personalNotes.title} ILIKE ${q}`, sql`${personalNotes.body} ILIKE ${q}`)!,
    );
  }

  return db
    .select()
    .from(personalNotes)
    .where(and(...conditions))
    .orderBy(desc(personalNotes.pinned), desc(personalNotes.updatedAt))
    .limit(opts?.limit ?? 200);
}

export async function createPersonalNote(input: z.infer<typeof noteSchema>) {
  const { user, workspaceId } = await getContext();
  const parsed = noteSchema.parse({
    ...input,
    recurrenceRule: normalizeRecurrence(input.recurrenceRule),
  });

  const [note] = await db
    .insert(personalNotes)
    .values({
      workspaceId,
      userId: user.id,
      title: parsed.title,
      body: parsed.body || null,
      dueDate: parseDueDate(parsed.dueDate),
      recurrenceRule: parsed.recurrenceRule,
      notify7d: parsed.notify7d,
      notify3d: parsed.notify3d,
      notify1d: parsed.notify1d,
      status: "open",
      pinned: parsed.pinned,
    })
    .returning();

  revalidatePath("/app/personal");
  revalidatePath("/app/journal");
  revalidatePath("/app");
  return note;
}

export async function updatePersonalNote(noteId: string, input: z.infer<typeof noteSchema>) {
  const { note } = await requireOwnedNote(noteId);
  const parsed = noteSchema.parse({
    ...input,
    recurrenceRule: normalizeRecurrence(input.recurrenceRule),
  });

  const dueDate = parseDueDate(parsed.dueDate);
  const dueChanged =
    (note.dueDate?.getTime() ?? null) !== (dueDate?.getTime() ?? null);

  const [updated] = await db
    .update(personalNotes)
    .set({
      title: parsed.title,
      body: parsed.body || null,
      dueDate,
      recurrenceRule: parsed.recurrenceRule,
      notify7d: parsed.notify7d,
      notify3d: parsed.notify3d,
      notify1d: parsed.notify1d,
      pinned: parsed.pinned,
      ...(dueChanged
        ? { lastReminded7d: null, lastReminded3d: null, lastReminded1d: null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(personalNotes.id, noteId))
    .returning();

  revalidatePath("/app/personal");
  revalidatePath("/app/journal");
  revalidatePath("/app");
  return updated;
}

export async function updatePersonalNoteStatus(noteId: string, status: PersonalNoteStatus) {
  if (!STATUS.includes(status)) throw new Error("Invalid status");
  await requireOwnedNote(noteId);

  await db
    .update(personalNotes)
    .set({ status, updatedAt: new Date() })
    .where(eq(personalNotes.id, noteId));

  revalidatePath("/app/personal");
  revalidatePath("/app/journal");
  revalidatePath("/app");
}

export async function togglePersonalNotePinned(noteId: string, pinned: boolean) {
  await requireOwnedNote(noteId);
  await db
    .update(personalNotes)
    .set({ pinned, updatedAt: new Date() })
    .where(eq(personalNotes.id, noteId));
  revalidatePath("/app/personal");
  revalidatePath("/app");
}

export async function deletePersonalNote(noteId: string) {
  await requireOwnedNote(noteId);
  await db.delete(personalNotes).where(eq(personalNotes.id, noteId));
  revalidatePath("/app/personal");
  revalidatePath("/app/journal");
  revalidatePath("/app");
}
