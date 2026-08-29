import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

const dialogSource = read("src/components/projects/project-create-dialog.tsx");
const formSource = read("src/components/forms/project-form.tsx");
const clientPageSource = read("src/app/(app)/app/clients/[clientId]/page.tsx");
const actionSource = read("src/lib/actions/projects.ts");

describe("client-scoped Project creation", () => {
  it("passes optional Client scope from shared dialog into shared form", () => {
    expect(dialogSource).toMatch(/clientId\?:\s*string/);
    expect(dialogSource).toMatch(/<ProjectForm[\s\S]*clientId=\{clientId\}/);
    expect(formSource).toMatch(/clientId\?:\s*string/);
    expect(formSource).toMatch(/!clientId\s*&&\s*\(/);
  });

  it("renders scoped create action in Client Project tab", () => {
    expect(clientPageSource).toContain('ProjectCreateDialog');
    expect(clientPageSource).toMatch(/<ProjectCreateDialog[\s\S]*clientId=\{clientId\}/);
    expect(dialogSource).toContain("Tambah Proyek");
  });

  it("closes and refreshes current Client route after success without replacing its tab query", () => {
    expect(dialogSource).toContain('import { useAppTransition } from "@/lib/transition-provider"');
    expect(dialogSource).toMatch(/setOpen\(false\)[\s\S]*refresh\(\)/);
    expect(dialogSource).not.toMatch(/router\.(?:push|replace)\(/);
    // Back link from project detail returns to the client's Projects tab
    const projectPage = read("src/app/(app)/app/projects/[projectId]/page.tsx");
    expect(projectPage).toContain('`/app/clients/${project.clientId}?tab=projects`');
    expect(clientPageSource).not.toContain('href={`?tab=projects`}');
  });

  it("hides Project creation from read-only workspace roles", () => {
    expect(clientPageSource).toContain("workspaceMembers.role");
    expect(clientPageSource).toMatch(/const canWrite\s*=\s*[^;]*"owner"[^;]*"member"/);
    expect(clientPageSource).toMatch(/\{canWrite\s*&&\s*\([\s\S]*<ProjectCreateDialog/);
  });

  it("keeps plan-limit state and explanation on Client detail", () => {
    expect(clientPageSource).toMatch(/checkEntityLimit\([\s\S]*workspaceId,[\s\S]*"projects",/);
    expect(clientPageSource).toMatch(/isAtLimit=\{[^}]+\}/);
    expect(clientPageSource).toMatch(/projectCount=\{[^}]+\}/);
    expect(clientPageSource).toMatch(/projectLimit=\{[^}]+\}/);
    expect(dialogSource).toContain("Upgrade dulu");
    expect(dialogSource).toContain("proyek di free plan");
  });

  it("validates Client scope against active workspace in server action", () => {
    expect(actionSource).toContain(
      "assertClientInWorkspace(db, user.id, workspaceId, parsed.clientId)",
    );
  });
});
