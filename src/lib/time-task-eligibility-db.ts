import { and, eq } from "drizzle-orm";
import { projects, tasks } from "@/db/schema";
import { resolveBillingModel } from "@/lib/billing-model";

type QueryDb = Pick<typeof import("@/db").db, "select">;

export async function assertTimeTaskEligible(
  database: QueryDb,
  input: {
    workspaceId: string;
    projectId: string;
    taskId: string | null | undefined;
    stage: "completion" | "manual" | "weekly" | "edit";
  },
) {
  const { workspaceId, projectId, taskId } = input;
  const [project] = await database
    .select({ billingModel: projects.billingModel, billingType: projects.billingType })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!project) throw new Error("Project tidak ditemukan");

  const model = resolveBillingModel(project);
  const taskRequired = model === "hourly" || model === "retainer";
  if (!taskRequired) return { required: false as const, task: null };
  if (!taskId) throw new Error("Task aktif wajib dipilih untuk proyek Hourly/Retainer");

  const [task] = await database
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(
      eq(tasks.id, taskId),
      eq(tasks.workspaceId, workspaceId),
      eq(tasks.projectId, projectId),
      eq(tasks.mode, "reusable"),
      eq(tasks.lifecycle, "active"),
    ))
    .limit(1);
  if (!task) throw new Error("Task tidak aktif atau tidak memenuhi syarat untuk proyek ini");
  return { required: true as const, task };
}
