import { ForbiddenError } from "./access";

type WorkspaceResource = {
  id: string;
  workspaceId: string;
};

type ProjectResource = WorkspaceResource & {
  clientId: string;
};

export function assertClientReference(
  client: WorkspaceResource | null | undefined,
  workspaceId: string,
) {
  if (!client || client.workspaceId !== workspaceId) {
    throw new ForbiddenError("Client access denied");
  }
  return client;
}

export function assertProjectReference(
  project: ProjectResource | null | undefined,
  expected: { workspaceId: string; clientId?: string | null },
) {
  if (!project || project.workspaceId !== expected.workspaceId) {
    throw new ForbiddenError("Project access denied");
  }
  if (expected.clientId && project.clientId !== expected.clientId) {
    throw new ForbiddenError("Project does not belong to client");
  }
  return project;
}

export function assertWritableRole(role: "owner" | "member" | "viewer") {
  if (role === "viewer") {
    throw new ForbiddenError("Read-only role cannot mutate workspace data");
  }
  return role;
}

export function assertWorkspaceUserReference(
  member: { userId: string } | null | undefined,
  userId: string | null | undefined,
) {
  if (!userId) return null;
  if (!member || member.userId !== userId) {
    throw new ForbiddenError("Assignee access denied");
  }
  return member;
}
