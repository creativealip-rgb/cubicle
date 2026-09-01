"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { personalGoals, personalGoalSteps, personalHabits } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";

const status = [
  "not_started",
  "in_progress",
  "achieved",
  "deferred",
  "cancelled",
] as const;
const goalInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  lifeArea: z.string().trim().min(1).max(100),
  deadline: z.string().date().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]),
  reward: z.string().trim().max(500).nullable().optional(),
  status: z.enum(status).default("not_started"),
  manualProgress: z.number().int().min(0).max(100).default(0),
});
const stepInput = z.object({ title: z.string().trim().min(1).max(300) });

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return requireUser(session?.user).id;
}
function refresh() {
  revalidatePath("/app/productivity");
}

export async function listPersonalGoals() {
  const id = await userId();
  const goals = await db
    .select()
    .from(personalGoals)
    .where(eq(personalGoals.userId, id))
    .orderBy(asc(personalGoals.sortOrder), asc(personalGoals.createdAt));
  const [steps, habits] = await Promise.all([
    db
      .select()
      .from(personalGoalSteps)
      .where(eq(personalGoalSteps.userId, id))
      .orderBy(
        asc(personalGoalSteps.sortOrder),
        asc(personalGoalSteps.createdAt),
      ),
    db
      .select()
      .from(personalHabits)
      .where(eq(personalHabits.userId, id))
      .orderBy(asc(personalHabits.createdAt)),
  ]);
  return goals.map((goal) => ({
    ...goal,
    steps: steps.filter((step) => step.goalId === goal.id),
    habits: habits.filter((habit) => habit.goalId === goal.id),
  }));
}
export async function getPersonalGoal(goalId: string) {
  const id = await userId();
  const [goal] = await db
    .select()
    .from(personalGoals)
    .where(and(eq(personalGoals.id, goalId), eq(personalGoals.userId, id)))
    .limit(1);
  if (!goal) return null;
  const steps = await db
    .select()
    .from(personalGoalSteps)
    .where(
      and(
        eq(personalGoalSteps.goalId, goalId),
        eq(personalGoalSteps.userId, id),
      ),
    )
    .orderBy(
      asc(personalGoalSteps.sortOrder),
      asc(personalGoalSteps.createdAt),
    );
  const habits = await db
    .select()
    .from(personalHabits)
    .where(
      and(eq(personalHabits.goalId, goalId), eq(personalHabits.userId, id)),
    );
  return { ...goal, steps, habits };
}
export async function createPersonalGoal(input: z.input<typeof goalInput>) {
  const id = await userId(),
    data = goalInput.parse(input);
  const [row] = await db
    .insert(personalGoals)
    .values({ ...data, userId: id, deadline: data.deadline || null })
    .returning();
  refresh();
  return row;
}
export async function updatePersonalGoal(
  goalId: string,
  input: z.input<typeof goalInput>,
) {
  const id = await userId(),
    data = goalInput.parse(input);
  const [row] = await db
    .update(personalGoals)
    .set({ ...data, deadline: data.deadline || null, updatedAt: new Date() })
    .where(and(eq(personalGoals.id, goalId), eq(personalGoals.userId, id)))
    .returning();
  if (!row) throw new Error("Goal not found");
  refresh();
  return row;
}
export async function addPersonalGoalStep(
  goalId: string,
  input: z.input<typeof stepInput>,
) {
  const id = await userId(),
    data = stepInput.parse(input);
  const goal = await getPersonalGoal(goalId);
  if (!goal) throw new Error("Goal not found");
  const [row] = await db
    .insert(personalGoalSteps)
    .values({ goalId, userId: id, title: data.title })
    .returning();
  refresh();
  return row;
}
export async function togglePersonalGoalStep(
  stepId: string,
  completed: boolean,
) {
  const id = await userId();
  const [row] = await db
    .update(personalGoalSteps)
    .set({
      isCompleted: completed,
      completedAt: completed ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(personalGoalSteps.id, stepId), eq(personalGoalSteps.userId, id)),
    )
    .returning();
  if (!row) throw new Error("Step not found");
  refresh();
  return row;
}
export async function hardDeletePersonalGoal(
  goalId: string,
  confirmation: string,
) {
  const id = await userId();
  return db.transaction(async (tx) => {
    const [goal] = await tx
      .select()
      .from(personalGoals)
      .where(and(eq(personalGoals.id, goalId), eq(personalGoals.userId, id)))
      .for("update");
    if (!goal || confirmation !== goal.title)
      throw new Error("Goal confirmation does not match");
    await tx
      .update(personalHabits)
      .set({ goalId: null, updatedAt: new Date() })
      .where(
        and(eq(personalHabits.goalId, goalId), eq(personalHabits.userId, id)),
      );
    await tx
      .delete(personalGoals)
      .where(and(eq(personalGoals.id, goalId), eq(personalGoals.userId, id)));
    refresh();
    return { ok: true };
  });
}
