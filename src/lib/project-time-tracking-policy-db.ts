import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { projects } from "@/db/schema";
import {
  assertProjectAllowsTimeEntry,
} from "@/lib/project-time-tracking-policy";
import { assertBillingModelAllowsTime, resolveBillingModel } from "@/lib/billing-model";

async function getProjectPolicy(database: Db, workspaceId: string, projectId: string) {
  const [project] = await database
    .select({
      id: projects.id,
      billingModel: projects.billingModel,
      billingType: projects.billingType,
      timeTrackingMode: projects.timeTrackingMode,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);

  if (!project) throw new Error("Project tidak berada di workspace aktif");
  return project;
}

export async function assertProjectTimeTrackingEnabled(
  database: Db,
  workspaceId: string,
  projectId: string,
) {
  const project = await getProjectPolicy(database, workspaceId, projectId);
  assertBillingModelAllowsTime(resolveBillingModel(project));
  assertProjectAllowsTimeEntry(project);
  return project.timeTrackingMode;
}

export async function getProjectTimeTrackingMode(
  database: Db,
  workspaceId: string,
  projectId: string,
) {
  const project = await getProjectPolicy(database, workspaceId, projectId);
  return project.timeTrackingMode;
}

export async function assertHistoricalTimeEntryMutable(
  database: Db,
  workspaceId: string,
  projectId: string | null,
): Promise<void> {
  if (!projectId) return;
  const project = await getProjectPolicy(database, workspaceId, projectId);
  try {
    assertBillingModelAllowsTime(resolveBillingModel(project));
    assertProjectAllowsTimeEntry(project);
  } catch {
    throw new Error("Histori waktu Project Harga Tetap/Paket legacy hanya dapat dibaca");
  }
}
