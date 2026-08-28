import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("project portal visibility", () => {
  const form = read("src/components/forms/project-form.tsx");

  it("renders portal visibility control and defaults client-scoped create on", () => {
    expect(form).toContain("Tampilkan di Portal Klien");
    expect(form).toContain("Klien dapat melihat proyek dan progresnya.");
    expect(form).toContain("defaultValues?.clientVisible ?? Boolean(clientId)");
  });

  it("keeps client selector hidden for client-scoped forms", () => {
    expect(form).toMatch(/!clientId\s*&&\s*\(/);
  });
});

describe("permanent delete contracts", () => {
  const clients = read("src/lib/actions/clients.ts");
  const projects = read("src/lib/actions/projects.ts");
  const tasks = read("src/lib/actions/tasks.ts");
  const button = read("src/components/shared/permanent-delete-button.tsx");

  it("uses workspace authorization and transactions for client/project deletes", () => {
    expect(clients).toContain("export async function permanentlyDeleteClient");
    expect(clients).toContain("assertWorkspaceWritable");
    expect(clients).toContain("db.transaction");
    expect(projects).toContain("export async function permanentlyDeleteProject");
    expect(projects).toContain("assertWorkspaceWritable");
    expect(projects).toContain("db.transaction");
  });

  it("deletes task time logs before task", () => {
    expect(tasks).toContain("export async function permanentlyDeleteTask");
    expect(tasks).toContain("tx.delete(timeEntries)");
    expect(tasks).toContain("tx.delete(tasks)");
  });

  it("requires typed entity name before permanent deletion", () => {
    expect(button).toContain("Ketik nama untuk konfirmasi");
    expect(button).toContain("confirmation !== entityName");
    expect(button).toContain("Hapus Permanen");
  });
});
