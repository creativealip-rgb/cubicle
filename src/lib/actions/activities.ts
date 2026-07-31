"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, projectActivities, projects } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  assertWorkspaceMember,
  assertWorkspaceWritable,
  requireUser,
} from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";

const activityInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  defaultBillable: z.boolean().optional(),
  defaultHourlyRate: z.number().nonnegative().nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
});
const activityUpdateSchema = activityInputSchema.partial();
const projectActivitySchema = z.object({
  activityId: z.string().uuid(),
  enabled: z.boolean().default(true),
  rateOverride: z.number().nonnegative().nullable().optional(),
  billableOverride: z.boolean().nullable().optional(),
});

async function actor() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  return { user, workspaceId };
}

function revalidateActivitySurfaces(projectId?: string) {
  revalidatePath("/app/activities");
  revalidatePath("/app/time");
  revalidatePath("/app/reports");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

function assertLegacyActivityCleanupWriteBlocked() {
  throw new Error("Aktivitas legacy sudah masuk fase cleanup; data historis hanya bisa dibaca");
}

export async function getWorkspaceActivities(options?: {
  includeArchived?: boolean;
}) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceMember(db, user.id, workspaceId);

  return db
    .select()
    .from(activities)
    .where(
      options?.includeArchived
        ? eq(activities.workspaceId, workspaceId)
        : and(
            eq(activities.workspaceId, workspaceId),
            eq(activities.status, "active"),
          ),
    )
    .orderBy(asc(activities.name));
}

export async function createActivity(
  input: z.infer<typeof activityInputSchema>,
) {
  await assertLegacyActivityCleanupWriteBlocked();
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = activityInputSchema.parse(input);

  const [created] = await db
    .insert(activities)
    .values({
      workspaceId,
      name: parsed.name,
      defaultBillable: parsed.defaultBillable ?? true,
      defaultHourlyRate:
        parsed.defaultHourlyRate == null
          ? null
          : String(parsed.defaultHourlyRate),
      status: parsed.status ?? "active",
      createdBy: user.id,
    })
    .returning();

  await writeActivityLog(
    workspaceId,
    user.id,
    "created_activity",
    "activity",
    created.id,
  );
  revalidateActivitySurfaces();
  return created;
}

export async function updateActivity(
  activityId: string,
  input: z.infer<typeof activityUpdateSchema>,
) {
  await assertLegacyActivityCleanupWriteBlocked();
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = activityUpdateSchema.parse(input);
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.name !== undefined) values.name = parsed.name;
  if (parsed.defaultBillable !== undefined) {
    values.defaultBillable = parsed.defaultBillable;
  }
  if (parsed.defaultHourlyRate !== undefined) {
    values.defaultHourlyRate =
      parsed.defaultHourlyRate == null
        ? null
        : String(parsed.defaultHourlyRate);
  }
  if (parsed.status !== undefined) values.status = parsed.status;

  const [updated] = await db
    .update(activities)
    .set(values)
    .where(
      and(eq(activities.id, activityId), eq(activities.workspaceId, workspaceId)),
    )
    .returning();
  if (!updated) throw new Error("Activity tidak ditemukan");

  await writeActivityLog(
    workspaceId,
    user.id,
    "updated_activity",
    "activity",
    activityId,
  );
  revalidateActivitySurfaces();
  return updated;
}

export async function archiveActivity(activityId: string) {
  await assertLegacyActivityCleanupWriteBlocked();
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [archived] = await db
    .update(activities)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(eq(activities.id, activityId), eq(activities.workspaceId, workspaceId)),
    )
    .returning();
  if (!archived) throw new Error("Activity tidak ditemukan");

  await db
    .update(projectActivities)
    .set({ enabled: false, updatedAt: new Date() })
    .where(
      and(
        eq(projectActivities.activityId, activityId),
        eq(projectActivities.workspaceId, workspaceId),
      ),
    );
  await writeActivityLog(
    workspaceId,
    user.id,
    "archived_activity",
    "activity",
    activityId,
  );
  revalidateActivitySurfaces();
  return archived;
}

export async function getProjectActivities(
  projectId: string,
  options?: { includeDisabled?: boolean },
) {
  const { user, workspaceId } = await actor();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!project) throw new Error("Project tidak ditemukan");

  return db
    .select({
      projectId: projectActivities.projectId,
      activityId: activities.id,
      name: activities.name,
      status: activities.status,
      enabled: projectActivities.enabled,
      rateOverride: projectActivities.rateOverride,
      billableOverride: projectActivities.billableOverride,
      defaultBillable: activities.defaultBillable,
      defaultHourlyRate: activities.defaultHourlyRate,
    })
    .from(projectActivities)
    .innerJoin(
      activities,
      and(
        eq(activities.id, projectActivities.activityId),
        eq(activities.workspaceId, projectActivities.workspaceId),
      ),
    )
    .where(
      options?.includeDisabled
        ? and(
            eq(projectActivities.projectId, projectId),
            eq(projectActivities.workspaceId, workspaceId),
          )
        : and(
            eq(projectActivities.projectId, projectId),
            eq(projectActivities.workspaceId, workspaceId),
            eq(projectActivities.enabled, true),
            eq(activities.status, "active"),
          ),
    )
    .orderBy(asc(activities.name));
}

export async function setProjectActivities(
  projectId: string,
  input: z.infer<typeof projectActivitySchema>[],
) {
  await assertLegacyActivityCleanupWriteBlocked();
  const { user, workspaceId } = await actor();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = z.array(projectActivitySchema).max(500).parse(input);
  const ids = parsed.map((row) => row.activityId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Activity Project duplikat");
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!project) throw new Error("Project tidak ditemukan");

  if (ids.length) {
    const catalogRows = await db
      .select({ id: activities.id, status: activities.status })
      .from(activities)
      .where(
        and(eq(activities.workspaceId, workspaceId), inArray(activities.id, ids)),
      );
    if (catalogRows.length !== ids.length) {
      throw new Error("Activity lintas workspace ditolak");
    }
    const statusById = new Map(catalogRows.map((row) => [row.id, row.status]));
    if (
      parsed.some(
        (row) =>
          row.enabled && statusById.get(row.activityId) !== "active",
      )
    ) {
      throw new Error("Activity archived tidak dapat diaktifkan pada Project");
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(projectActivities)
      .set({ enabled: false, updatedAt: new Date() })
      .where(
        and(
          eq(projectActivities.projectId, projectId),
          eq(projectActivities.workspaceId, workspaceId),
        ),
      );

    for (const row of parsed) {
      await tx
        .insert(projectActivities)
        .values({
          workspaceId,
          projectId,
          activityId: row.activityId,
          enabled: row.enabled,
          rateOverride:
            row.rateOverride == null ? null : String(row.rateOverride),
          billableOverride: row.billableOverride ?? null,
        })
        .onConflictDoUpdate({
          target: [projectActivities.projectId, projectActivities.activityId],
          set: {
            enabled: row.enabled,
            rateOverride:
              row.rateOverride == null ? null : String(row.rateOverride),
            billableOverride: row.billableOverride ?? null,
            updatedAt: new Date(),
          },
        });
    }
  });

  await writeActivityLog(
    workspaceId,
    user.id,
    "updated_project_activities",
    "project",
    projectId,
  );
  revalidateActivitySurfaces(projectId);
  return getProjectActivities(projectId, { includeDisabled: true });
}
