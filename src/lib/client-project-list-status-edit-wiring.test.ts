import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const clients = readFileSync("src/components/clients/clients-list-table.tsx", "utf8");
const projects = readFileSync("src/components/projects/projects-list-table.tsx", "utf8");
const clientAction = readFileSync("src/lib/actions/clients.ts", "utf8");
const projectAction = readFileSync("src/lib/actions/projects.ts", "utf8");

describe("list status editors", () => {
  it("renders client Edit action in the final desktop and mobile positions", () => {
    expect(clients).toContain("ClientStatusEditDialog");
    expect(clients).toContain('t("Aksi", "Action")');
    expect(clients.match(/<ClientStatusEditDialog/g)?.length).toBeGreaterThanOrEqual(2);
    expect(clientAction).toContain('z.enum(["active", "inactive", "archived"])');
  });

  it("limits project status editing to active, on hold, and completed", () => {
    expect(projects).toContain("ProjectStatusEditDialog");
    expect(projects).toContain('t("Aksi", "Action")');
    expect(projects.match(/<ProjectStatusEditDialog/g)?.length).toBeGreaterThanOrEqual(2);
    expect(projectAction).toContain('z.enum(["active", "on_hold", "completed"])');
  });
});
