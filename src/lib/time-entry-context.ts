import { and, eq } from "drizzle-orm";
import { type Db } from "@/db";
import { clients, projects, tasks } from "@/db/schema";

export type TimeContextInput = {
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
};

export async function assertTimeEntryContext(
  database: Db,
  workspaceId: string,
  input: TimeContextInput,
): Promise<TimeContextInput> {
  const { clientId = null, projectId = null, taskId = null } = input;

  if (taskId && !projectId) {
    throw new Error("Task wajib terhubung ke Project");
  }
  if (projectId && !clientId) {
    throw new Error("Project wajib terhubung ke Client");
  }
  if (!clientId && !projectId && !taskId) return { clientId, projectId, taskId };

  if (clientId) {
    const [client] = await database
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
      .limit(1);
    if (!client) throw new Error("Client tidak berada di workspace aktif");
  }

  if (projectId) {
    const [project] = await database
      .select({ id: projects.id, clientId: projects.clientId })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);
    if (!project || project.clientId !== clientId) {
      throw new Error("Project tidak sesuai dengan Client/workspace");
    }
  }

  if (taskId) {
    const [task] = await database
      .select({ id: tasks.id, projectId: tasks.projectId })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    if (!task || task.projectId !== projectId) {
      throw new Error("Task tidak sesuai dengan Project/workspace");
    }
  }

  return { clientId, projectId, taskId };
}

