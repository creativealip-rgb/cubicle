import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actionsDir = join(process.cwd(), "src/lib/actions");
const source = (name: string) => readFileSync(join(actionsDir, name), "utf8");

function functionBody(file: string, functionName: string) {
  const text = source(file);
  const start = text.indexOf(`export async function ${functionName}(`);
  expect(start, `${functionName} missing in ${file}`).toBeGreaterThanOrEqual(0);
  const next = text.indexOf("\nexport async function ", start + 1);
  return text.slice(start, next === -1 ? text.length : next);
}

describe("tenant boundary wiring", () => {
  it("validates foreign client on project create and update", () => {
    expect(functionBody("projects.ts", "createProject")).toContain("assertClientInWorkspace");
    expect(functionBody("projects.ts", "updateProject")).toContain("assertClientInWorkspace");
  });

  it("validates project and assignee on task create", () => {
    const body = functionBody("tasks.ts", "createTask");
    expect(body).toContain("assertProjectInWorkspace");
    expect(body).toContain("assertAssigneeInWorkspace");
    expect(functionBody("tasks.ts", "updateTask")).toContain("assertAssigneeInWorkspace");
    expect(functionBody("tasks.ts", "assignTask")).toContain("assertAssigneeInWorkspace");
  });

  it("validates client on proposal create", () => {
    expect(functionBody("proposals.ts", "createProposal")).toContain("assertClientInWorkspace");
  });

  it("validates client, project, and template on contract create", () => {
    const body = functionBody("contracts.ts", "createContract");
    expect(body).toContain("assertClientInWorkspace");
    expect(body).toContain("assertProjectInWorkspace");
    expect(body).toContain("contractTemplates.workspaceId");
  });

  it("requires writable role for portal admin mutations", () => {
    expect(functionBody("portal-requests.ts", "createPortalRequest")).toContain("assertWorkspaceWritable");
    expect(functionBody("portal-requests.ts", "updatePortalRequestAdmin")).toContain("assertWorkspaceWritable");
  });

  it("scopes public portal mutations to token client and workspace", () => {
    for (const fn of ["completePortalRequest", "respondPortalRequest"]) {
      const body = functionBody("portal-requests.ts", fn);
      expect(body).toContain("portalRequests.clientId, client.id");
      expect(body).toContain("portalRequests.workspaceId, client.workspaceId");
    }
  });

  it("scopes expense and file relations before create", () => {
    expect(functionBody("expenses.ts", "createExpense")).toContain("resolveExpenseRelations");
    const fileBody = functionBody("files.ts", "completeUpload");
    expect(fileBody).toContain("assertClientInWorkspace");
    expect(fileBody).toContain("assertProjectInWorkspace");
    expect(fileBody).toContain("storageKey.startsWith(`workspaces/${parsed.workspaceId}/`)");
  });
});
