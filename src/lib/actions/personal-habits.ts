"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  personalHabitCheckins,
  personalHabits,
  personalGoals,
  users,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { isHabitScheduled } from "@/lib/personal-productivity/habits";

const input = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).nullable().optional(),
    goalId: z.string().uuid().nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    icon: z.string().max(50).nullable().optional(),
    frequency: z.enum(["daily", "specific_weekdays"]),
    weekdays: z.array(z.number().int().min(0).max(6)).default([]),
    startDate: z.string().date(),
    status: z.enum(["active", "archived"]).default("active"),
  })
  .superRefine((v, c) => {
    const days = [...new Set(v.weekdays)].sort();
    if (v.frequency === "daily" && days.length)
      c.addIssue({
        code: "custom",
        message: "Daily habits cannot select weekdays",
      });
    if (v.frequency === "specific_weekdays" && !days.length)
      c.addIssue({ code: "custom", message: "Select at least one weekday" });
  });
async function context() {
  const session = await auth.api.getSession({ headers: await headers() }),
    user = requireUser(session?.user);
  const [row] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, user.id));
  return { userId: user.id, timezone: row?.timezone || "Asia/Jakarta" };
}
function localToday(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function refresh() {
  revalidatePath("/app/productivity");
}
export async function listPersonalHabits() {
  const { userId } = await context();
  const habits = await db
    .select()
    .from(personalHabits)
    .where(eq(personalHabits.userId, userId))
    .orderBy(asc(personalHabits.createdAt));
  const checkins = await db
    .select()
    .from(personalHabitCheckins)
    .where(eq(personalHabitCheckins.userId, userId))
    .orderBy(desc(personalHabitCheckins.localDate));
  const today = localToday((await context()).timezone);
  return habits.map((h) => ({
    ...h,
    today,
    checkins: checkins.filter((c) => c.habitId === h.id),
  }));
}
export async function createPersonalHabit(raw: z.input<typeof input>) {
  const { userId } = await context(),
    v = input.parse(raw),
    weekdays = v.frequency === "daily" ? [] : [...new Set(v.weekdays)].sort();
  if (v.goalId) {
    const [goal] = await db
      .select({ id: personalGoals.id })
      .from(personalGoals)
      .where(
        and(eq(personalGoals.id, v.goalId), eq(personalGoals.userId, userId)),
      );
    if (!goal) throw new Error("Goal not found");
  }
  const [row] = await db
    .insert(personalHabits)
    .values({ ...v, weekdays, userId })
    .returning();
  refresh();
  return row;
}
export async function updatePersonalHabit(
  id: string,
  raw: z.input<typeof input>,
) {
  const { userId } = await context(),
    v = input.parse(raw),
    weekdays = v.frequency === "daily" ? [] : [...new Set(v.weekdays)].sort();
  const [row] = await db
    .update(personalHabits)
    .set({ ...v, weekdays, updatedAt: new Date() })
    .where(and(eq(personalHabits.id, id), eq(personalHabits.userId, userId)))
    .returning();
  if (!row) throw new Error("Habit not found");
  refresh();
  return row;
}
export async function setPersonalHabitCheckinNote(
  habitId: string,
  note: string,
  date?: string,
) {
  const { userId, timezone } = await context();
  const localDate = date || localToday(timezone);
  const [row] = await db
    .update(personalHabitCheckins)
    .set({ note: note.trim().slice(0, 2000) || null })
    .where(
      and(
        eq(personalHabitCheckins.habitId, habitId),
        eq(personalHabitCheckins.userId, userId),
        eq(personalHabitCheckins.localDate, localDate),
      ),
    )
    .returning();
  if (!row) throw new Error("Check-in not found");
  refresh();
  return row;
}
export async function togglePersonalHabitCheckin(
  habitId: string,
  date?: string,
) {
  const { userId, timezone } = await context(),
    localDate = date || localToday(timezone);
  if (localDate > localToday(timezone))
    throw new Error("Future check-ins are not allowed");
  const [habit] = await db
    .select()
    .from(personalHabits)
    .where(
      and(eq(personalHabits.id, habitId), eq(personalHabits.userId, userId)),
    );
  if (!habit) throw new Error("Habit not found");
  if (
    localDate < habit.startDate ||
    !isHabitScheduled(
      habit.frequency as "daily" | "specific_weekdays",
      habit.weekdays,
      localDate,
    )
  )
    throw new Error("Habit is not scheduled for this date");
  const removed = await db
    .delete(personalHabitCheckins)
    .where(
      and(
        eq(personalHabitCheckins.habitId, habitId),
        eq(personalHabitCheckins.userId, userId),
        eq(personalHabitCheckins.localDate, localDate),
      ),
    )
    .returning();
  if (!removed.length)
    await db
      .insert(personalHabitCheckins)
      .values({ habitId, userId, localDate })
      .onConflictDoNothing({
        target: [
          personalHabitCheckins.habitId,
          personalHabitCheckins.localDate,
        ],
      });
  refresh();
  return { completed: !removed.length };
}
export async function listHabitCheckins(from: string, to: string) {
  const { userId } = await context();
  return db
    .select()
    .from(personalHabitCheckins)
    .where(
      and(
        eq(personalHabitCheckins.userId, userId),
        gte(personalHabitCheckins.localDate, from),
        lte(personalHabitCheckins.localDate, to),
      ),
    );
}
