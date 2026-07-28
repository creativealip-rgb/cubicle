import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { activities, projectActivities, projects } from "@/db/schema";
import {
  assertActivitySelection,
  assertSelectableActivity,
  type ActivitySelectionStage,
} from "@/lib/activity-policy";

export type ActivityWritePolicy = {
  activityId: string | null;
  defaultBillable: boolean | null;
  defaultHourlyRate: number | null;
  billableOverride: boolean | null;
  rateOverride: number | null;
};

export async function assertActivityWriteAllowed(
  database: Db,
  input: {
    workspaceId: string;
    projectId: string | null | undefined;
    activityId: string | null | undefined;
    stage: ActivitySelectionStage;
  },
): Promise<ActivityWritePolicy> {
  if (!input.projectId) {
    if (input.activityId) {
      throw new Error("Activity hanya dapat dipilih setelah Project dipilih");
    }
    return {
      activityId: null,
      defaultBillable: null,
      defaultHourlyRate: null,
      billableOverride: null,
      rateOverride: null,
    };
  }

  const [project] = await database
    .select({ activityRequired: projects.activityRequired })
    .from(projects)
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projects.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);
  if (!project) throw new Error("Project tidak ditemukan di workspace ini");

  assertActivitySelection({
    activityRequired: project.activityRequired,
    activityId: input.activityId,
    stage: input.stage,
  });

  if (!input.activityId) {
    return {
      activityId: null,
      defaultBillable: null,
      defaultHourlyRate: null,
      billableOverride: null,
      rateOverride: null,
    };
  }

  const [selection] = await database
    .select({
      activityId: activities.id,
      activityWorkspaceId: activities.workspaceId,
      activityStatus: activities.status,
      defaultBillable: activities.defaultBillable,
      defaultHourlyRate: activities.defaultHourlyRate,
      mappingWorkspaceId: projectActivities.workspaceId,
      mappingEnabled: projectActivities.enabled,
      billableOverride: projectActivities.billableOverride,
      rateOverride: projectActivities.rateOverride,
    })
    .from(activities)
    .leftJoin(
      projectActivities,
      and(
        eq(projectActivities.activityId, activities.id),
        eq(projectActivities.projectId, input.projectId),
        eq(projectActivities.workspaceId, input.workspaceId),
      ),
    )
    .where(
      and(
        eq(activities.id, input.activityId),
        eq(activities.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  assertSelectableActivity({
    sameWorkspace: Boolean(
      selection && selection.activityWorkspaceId === input.workspaceId,
    ),
    status: (selection?.activityStatus as "active" | "archived") ?? "archived",
    projectEnabled: Boolean(selection?.mappingEnabled),
  });

  return {
    activityId: selection!.activityId,
    defaultBillable: selection!.defaultBillable,
    defaultHourlyRate:
      selection!.defaultHourlyRate == null
        ? null
        : Number(selection!.defaultHourlyRate),
    billableOverride: selection!.billableOverride,
    rateOverride:
      selection!.rateOverride == null ? null : Number(selection!.rateOverride),
  };
}
