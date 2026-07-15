"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { personalNotes, projects, tasks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertWorkspaceOwner, requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";

const RECURRENCE = ["none", "daily", "weekly", "monthly", "yearly"] as const;
const STATUS = ["open", "done", "archived"] as const;
const NOTES_PAGE_SIZE = 25;

export async function getNotesPageSize() {
  return NOTES_PAGE_SIZE;
}

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

/** Advance due date by recurrence rule. Keeps local wall-clock components. */
function advanceDueDate(from: Date, rule: PersonalNoteRecurrence): Date {
  const next = new Date(from.getTime());
  switch (rule) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly": {
      const day = next.getDate();
      next.setMonth(next.getMonth() + 1);
      // clamp end-of-month overflow (Jan 31 → Mar 3 style fix)
      if (next.getDate() < day) next.setDate(0);
      break;
    }
    case "yearly": {
      const day = next.getDate();
      next.setFullYear(next.getFullYear() + 1);
      if (next.getDate() < day) next.setDate(0);
      break;
    }
    default:
      break;
  }
  return next;
}

/** Roll due forward until strictly after `after` (usually now). */
function rollDueUntilAfter(
  from: Date,
  rule: PersonalNoteRecurrence,
  after: Date,
  maxSteps = 500,
): Date {
  if (rule === "none") return from;
  let next = from;
  let steps = 0;
  while (next.getTime() <= after.getTime() && steps < maxSteps) {
    next = advanceDueDate(next, rule);
    steps += 1;
  }
  return next;
}

function clearRemindedPatch() {
  return {
    lastReminded7d: null as Date | null,
    lastReminded3d: null as Date | null,
    lastReminded1d: null as Date | null,
  };
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

function baseNoteConditions(
  workspaceId: string,
  userId: string,
  opts?: {
    status?: PersonalNoteStatus | "all" | "active";
    includeSystem?: boolean;
    titlePrefix?: string;
    query?: string;
  },
) {
  const conditions: SQL[] = [
    eq(personalNotes.workspaceId, workspaceId),
    eq(personalNotes.userId, userId),
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

  if (opts?.query?.trim()) {
    const q = `%${opts.query.trim()}%`;
    conditions.push(
      or(sql`${personalNotes.title} ILIKE ${q}`, sql`${personalNotes.body} ILIKE ${q}`)!,
    );
  }

  return conditions;
}

export async function listPersonalNotes(
  query?: string,
  opts?: {
    status?: PersonalNoteStatus | "all" | "active";
    includeSystem?: boolean;
    titlePrefix?: string;
    limit?: number;
    offset?: number;
  },
) {
  const { user, workspaceId } = await getContext();
  const conditions = baseNoteConditions(workspaceId, user.id, {
    status: opts?.status,
    includeSystem: opts?.includeSystem,
    titlePrefix: opts?.titlePrefix,
    query,
  });

  return db
    .select()
    .from(personalNotes)
    .where(and(...conditions))
    .orderBy(desc(personalNotes.pinned), desc(personalNotes.updatedAt))
    .limit(opts?.limit ?? 200)
    .offset(opts?.offset ?? 0);
}

export async function countPersonalNotes(
  query?: string,
  opts?: {
    status?: PersonalNoteStatus | "all" | "active";
    includeSystem?: boolean;
    titlePrefix?: string;
  },
) {
  const { user, workspaceId } = await getContext();
  const conditions = baseNoteConditions(workspaceId, user.id, {
    status: opts?.status,
    includeSystem: opts?.includeSystem,
    titlePrefix: opts?.titlePrefix,
    query,
  });

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(personalNotes)
    .where(and(...conditions));
  return row?.count ?? 0;
}

export async function countPersonalNotesByStatus(
  query?: string,
  opts?: { includeSystem?: boolean },
) {
  const { user, workspaceId } = await getContext();
  const conditions = baseNoteConditions(workspaceId, user.id, {
    status: "all",
    includeSystem: opts?.includeSystem,
    query,
  });

  const rows = await db
    .select({
      status: personalNotes.status,
      count: sql<number>`count(*)::int`,
    })
    .from(personalNotes)
    .where(and(...conditions))
    .groupBy(personalNotes.status);

  const counts = { open: 0, done: 0, archived: 0, all: 0 };
  for (const row of rows) {
    const n = Number(row.count) || 0;
    if (row.status === "open") counts.open = n;
    else if (row.status === "done") counts.done = n;
    else if (row.status === "archived") counts.archived = n;
    counts.all += n;
  }
  return counts;
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
      ...(dueChanged ? clearRemindedPatch() : {}),
      updatedAt: new Date(),
    })
    .where(eq(personalNotes.id, noteId))
    .returning();

  revalidatePath("/app/personal");
  revalidatePath("/app/journal");
  revalidatePath("/app");
  return updated;
}

/**
 * Status transitions.
 * Recurring notes marked done → roll due to next occurrence, stay open.
 * Non-recurring → status done.
 */
export async function updatePersonalNoteStatus(noteId: string, status: PersonalNoteStatus) {
  if (!STATUS.includes(status)) throw new Error("Invalid status");
  const { note } = await requireOwnedNote(noteId);
  const rule = normalizeRecurrence(note.recurrenceRule || "none");

  if (status === "done" && rule !== "none" && note.dueDate) {
    const nextDue = rollDueUntilAfter(note.dueDate, rule, new Date());
    await db
      .update(personalNotes)
      .set({
        status: "open",
        dueDate: nextDue,
        ...clearRemindedPatch(),
        updatedAt: new Date(),
      })
      .where(eq(personalNotes.id, noteId));
  } else {
    await db
      .update(personalNotes)
      .set({ status, updatedAt: new Date() })
      .where(eq(personalNotes.id, noteId));
  }

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

/**
 * Convert personal note → workspace task on a project.
 * Archives the note after successful task create.
 */
export async function convertPersonalNoteToTask(
  noteId: string,
  projectId: string,
  opts?: { priority?: "low" | "medium" | "high" | "urgent"; archiveNote?: boolean },
) {
  const { user, workspaceId, note } = await requireOwnedNote(noteId);
  if (!z.string().uuid().safeParse(projectId).success) {
    throw new Error("Valid project required");
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!project) throw new Error("Project not found in workspace");

  const dueDateStr = note.dueDate
    ? note.dueDate.toISOString().slice(0, 10)
    : null;

  const [maxPos] = await db
    .select({ max: sql<number>`coalesce(max(${tasks.position}), -1)::int` })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "todo")));

  const [task] = await db
    .insert(tasks)
    .values({
      workspaceId,
      projectId,
      title: note.title,
      description: note.body || null,
      status: "todo",
      priority: opts?.priority ?? "medium",
      assigneeId: user.id,
      dueDate: dueDateStr,
      clientVisible: false,
      position: (maxPos?.max ?? -1) + 1,
      createdBy: user.id,
    })
    .returning();

  await writeActivityLog(workspaceId, user.id, "created_task", "task", task.id);

  if (opts?.archiveNote !== false) {
    await db
      .update(personalNotes)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(personalNotes.id, noteId));
  }

  revalidatePath("/app/personal");
  revalidatePath("/app/tasks");
  revalidatePath("/app");
  return task;
}

/**
 * Cron/helper: roll open recurring notes whose dueDate is past.
 * Returns number of notes rolled.
 */
export async function rollOverdueRecurringNotes(limit = 200) {
  const now = new Date();
  const candidates = await db
    .select()
    .from(personalNotes)
    .where(
      and(
        eq(personalNotes.status, "open"),
        sql`${personalNotes.dueDate} IS NOT NULL`,
        sql`${personalNotes.dueDate} < ${now.toISOString()}`,
        sql`${personalNotes.recurrenceRule} IS NOT NULL`,
        sql`${personalNotes.recurrenceRule} <> ${"none"}`,
        sql`${personalNotes.title} NOT LIKE ${"[journal]%"}`,
        sql`${personalNotes.title} NOT LIKE ${"[site]%"}`,
      ),
    )
    .limit(limit);

  let rolled = 0;
  for (const note of candidates) {
    const rule = normalizeRecurrence(note.recurrenceRule || "none");
    if (rule === "none" || !note.dueDate) continue;
    const nextDue = rollDueUntilAfter(note.dueDate, rule, now);
    if (nextDue.getTime() === note.dueDate.getTime()) continue;
    await db
      .update(personalNotes)
      .set({
        dueDate: nextDue,
        ...clearRemindedPatch(),
        updatedAt: new Date(),
      })
      .where(eq(personalNotes.id, note.id));
    rolled += 1;
  }
  return rolled;
}
